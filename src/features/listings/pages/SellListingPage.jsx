import React, { useEffect, useState } from 'react'
import { ArrowLeft, Check, ImagePlus, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { getProfile } from '../../account/services/profileService'
import { isIdentityApproved } from '../../account/utils/verification'
import { MobileBrand } from '../../../components/mobile/MobileNavigation'
import '../styles/listings.css';
import '../styles/SellListingPage.css';

// Renders the sell page and manages the form used to create a hardware listing.
export default function SellListingPage({ session, onBack }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    brand: "",
    model: "",
    category: "",
    price: "",
    condition: "Good",
    description: "",
    image: null,
  });

  const [specs, setSpecs] = useState({});
  const [imagePreview, setImagePreview] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  useEffect(() => {
    if (step > 0) document.getElementById('sell-step-title')?.focus();
  }, [step]);

  // Load categories once, then load their spec definitions whenever the chosen category changes.
  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      if (!supabase) {
        setNotice("Supabase is not configured.");
        setLoadingCategories(false);
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (!active) return;
      if (error) {
        setNotice(`Unable to load categories: ${error.message}`);
      } else {
        setCategories(data || []);
        setForm((current) => ({
          ...current,
          category: current.category || data?.[0]?.name || "",
        }));
      }
      setLoadingCategories(false);
    };

    loadCategories();
    return () => { active = false; };
  }, []);

  // Specification definitions describe the form; entered values are saved in listings.specs JSONB.
  useEffect(() => {
    let active = true;
    const category = categories.find((item) => item.name === form.category);

    if (!category || !supabase) {
      setSelectedSpecs([]);
      setLoadingSpecs(false);
      return () => { active = false; };
    }

    const loadSpecs = async () => {
      setLoadingSpecs(true);
      const { data, error } = await supabase
        .from("category_specifications")
        .select("spec_key, label, input_type, is_required, options, sort_order")
        .eq("category_id", category.id)
        .order("sort_order");

      if (!active) return;
      if (error) {
        setNotice(`Unable to load category specifications: ${error.message}`);
        setSelectedSpecs([]);
      } else {
        setSelectedSpecs(data || []);
      }
      setLoadingSpecs(false);
    };

    loadSpecs();
    return () => { active = false; };
  }, [categories, form.category]);

  // Updates the main listing fields and creates a preview when a product image is selected.
  const updateForm = (event) => {
    const { name, value, files } = event.target;

    if (name === "image") {
      const file = files?.[0] || null;
      setForm((current) => ({ ...current, image: file }));
      setImagePreview(file ? URL.createObjectURL(file) : "");
      return;
    }
    
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "category") setSpecs({});
  };

  // Updates the category-specific technical specification fields.
  const updateSpec = (event) => {
    const { name, value } = event.target;
    setSpecs((current) => ({ ...current, [name]: value }));
  };

  // Uploads the selected image and saves the listing details to Supabase.
  const saveListing = async (event) => {
    event.preventDefault();
    if (!supabase) return setNotice("Supabase is not configured.");
    const selectedCategory = categories.find((category) => category.name === form.category);
    if (!selectedCategory) return setNotice("Choose an available category before saving.");
    if (!form.image) { setStep(0); return setNotice('Add a product photo.'); }
    if (!form.brand.trim() || !form.model.trim() || !form.description.trim() || !Number.isFinite(Number(form.price)) || Number(form.price) <= 0 || selectedSpecs.some((spec) => spec.is_required && !String(specs[spec.spec_key] || '').trim())) {
      setStep(1);
      return setNotice('Complete the required item details before submitting.');
    }

    // Convert number inputs to JSON numbers and omit blank optional fields before saving.
    const listingSpecs = Object.fromEntries(
      selectedSpecs
        .map((spec) => [spec, specs[spec.spec_key]?.trim() ?? ""])
        .filter(([spec, value]) => value !== "")
        .map(([spec, value]) => [
          spec.spec_key,
          spec.input_type === "number" ? Number(value) : value,
        ]),
    );

    setSaving(true);

    try {
      const eligibility = await getProfile(session.user.id);
      if (eligibility.error) throw eligibility.error;
      if (!isIdentityApproved(eligibility.data)) throw new Error('Administrator identity approval is required before selling.');
      const extension = form.image.name.split(".").pop()?.toLowerCase() || "jpg";

      const imagePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;

      const upload = await supabase.storage
        .from("listing-images")
        .upload(imagePath, form.image, {
          contentType: form.image.type,
          upsert: false,
        });

      if (upload.error) throw upload.error;

      const imageUrl = supabase.storage
        .from("listing-images")
        .getPublicUrl(imagePath).data.publicUrl;

      const { error } = await supabase.from("listings").insert({
        seller_id: session.user.id,
        brand: form.brand.trim(),
        model: form.model.trim(),
        category: form.category,
        category_id: selectedCategory.id,
        price: Number(form.price),
        condition: form.condition,
        description: form.description.trim(),
        image_url: imageUrl,
        specs: listingSpecs,
      });
      if (error) throw error;
      navigate('/listings/manage', { state: { listingSubmitted: true }, replace: true });
    } catch (error) {
      setNotice(`Unable to save listing: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="sell-page">
      <MobileBrand />
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> BACK TO MARKETPLACE
      </button>
      <section className="sell-page-panel">
        <div className="sell-page-heading">
          <div>
            <h1 id="sell-step-title" tabIndex={-1}>{['Sell an item', 'Item details', 'Review your listing'][step]}</h1>
            <p>{['Start with a clear photo of your hardware.', 'Help buyers find the right upgrade.', 'Check everything before submitting.'][step]}</p>
          </div>
          <span className="sell-page-status">● READY TO LIST</span>
        </div>
        <ol className="shop-form-steps" aria-label="Listing progress">{['Photo', 'Details', 'Review'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} data-complete={step > index}><span>{step > index ? <Check aria-hidden="true" /> : index + 1}</span>{label}</li>)}</ol>
        {notice && (
          <div className="sell-notice sell-notice--error" role="alert">{notice}</div>
        )}
        <form className="listing-form shop-listing-wizard" onSubmit={(event) => {
          if (step < 2) { event.preventDefault(); setNotice(''); setStep((current) => current + 1); }
          else saveListing(event);
        }}>
          <fieldset className="shop-form-stage" hidden={step !== 0} disabled={step !== 0 || saving}>
          <legend className="shop-sr-only">Product photo</legend>
          <label className="listing-form-wide shop-photo-upload">
            <ImagePlus aria-hidden="true" />
            <strong>{imagePreview ? 'Change product photo' : 'Add a product photo'}</strong>
            <input name="image" type="file" accept="image/*" onChange={updateForm} required />
            <small>Use a clear, well-lit photo of the actual component.</small>
          </label>
          {imagePreview && (
            <div className="image-preview listing-form-wide">
              <img src={imagePreview} alt="Selected product preview" />
            </div>
          )}
          <p className="shop-help listing-form-wide">Show the condition clearly. You can describe any wear and included accessories in the next step.</p>
          </fieldset>
          <fieldset className="shop-form-stage" hidden={step !== 1} disabled={step !== 1 || saving}>
          <legend className="shop-sr-only">Item details</legend>
          <label>
            Brand
            <input
              name="brand"
              value={form.brand}
              onChange={updateForm}
              required
              placeholder="e.g. AMD"
            />
          </label>
          <label>
            Model
            <input
              name="model"
              value={form.model}
              onChange={updateForm}
              required
              placeholder="e.g. Ryzen 5 5600X"
            />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={updateForm} required disabled={loadingCategories || categories.length === 0}>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            Price (₱)
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              value={form.price}
              onChange={updateForm}
              required
              placeholder="5850"
            />
          </label>
          <label>
            Condition
            <select
              name="condition"
              value={form.condition}
              onChange={updateForm}
            >
              <option>Like new</option>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
            </select>
          </label>

          {selectedSpecs.map((spec) => (
            <label key={spec.spec_key}>
              {spec.label}
              {spec.input_type === "select" ? (
                <select name={spec.spec_key} value={specs[spec.spec_key] || ""} onChange={updateSpec} required={spec.is_required}>
                  <option value="">Choose an option</option>
                  {(Array.isArray(spec.options) ? spec.options : []).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={spec.spec_key}
                  type={spec.input_type === "number" ? "number" : "text"}
                  value={specs[spec.spec_key] || ""}
                  onChange={updateSpec}
                  required={spec.is_required}
                />
              )}
            </label>
          ))}
          
          <label className="listing-form-wide">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={updateForm}
              required
              rows="5"
              placeholder="Describe usage, testing, included accessories, and flaws."
            />
          </label>
          </fieldset>
          {step === 2 && <div className="shop-listing-review listing-form-wide">
            <img src={imagePreview} alt={`${form.brand} ${form.model}`} />
            <h2>{form.brand} {form.model}</h2><strong className="shop-review-price">₱{Number(form.price).toLocaleString('en-PH')}</strong>
            <dl className="shop-costs"><div><dt>Category</dt><dd>{form.category}</dd></div><div><dt>Condition</dt><dd>{form.condition}</dd></div>{selectedSpecs.filter((spec) => specs[spec.spec_key]).map((spec) => <div key={spec.spec_key}><dt>{spec.label}</dt><dd>{specs[spec.spec_key]}</dd></div>)}</dl>
            <p className="shop-review-description">{form.description}</p>
            <div className="shop-review-notice"><ShieldCheck aria-hidden="true" /><p><strong>Ready for review</strong>An administrator will check your listing before it appears in Browse.</p></div>
            <p className="shop-help">By submitting, you accept paid reservations and share your profile phone number with the buyer during their confirmed hold. The buyer pays the item price directly to you.</p>
          </div>}
          <div className="shop-form-actions listing-form-wide">
            {step > 0 && <button className="shop-secondary" type="button" disabled={saving} onClick={() => { setNotice(''); setStep((current) => current - 1); }}>Back</button>}
            <button key={step} className="publish-button" type="submit" disabled={saving || loadingCategories || loadingSpecs || categories.length === 0}>
              {loadingCategories ? 'Loading categories…' : loadingSpecs ? 'Loading specs…' : saving ? 'Submitting…' : ['Continue', 'Review listing', 'Submit for approval'][step]}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
