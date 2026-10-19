import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { getProfile } from '../../account/services/profileService'
import { isIdentityApproved } from '../../account/utils/verification'
import './SellListingPage.css'

// Renders the sell page and manages the form used to create a hardware listing.
export default function SellListingPage({ session, onBack }) {
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
      onBack();
    } catch (error) {
      setNotice(`Unable to save listing: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="sell-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" /> BACK TO MARKETPLACE
      </button>
      <section className="sell-page-panel">
        <div className="sell-page-heading">
          <div>
            <span className="section-index">MARKETPLACE / 02</span>
            <h1>List your hardware.</h1>
            <p>Give your gear a better second life.</p>
          </div>
          <span className="sell-page-status">● READY TO LIST</span>
        </div>
        <div className="sell-page-intro">Complete the details below so buyers can understand exactly what they are getting.</div>
        {notice && (
          <div className="sell-notice sell-notice--error">{notice}</div>
        )}
        <form className="listing-form" onSubmit={saveListing}>
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
          <label className="listing-form-wide">
            Product photo
            <input
              name="image"
              type="file"
              accept="image/*"
              onChange={updateForm}
              required
            />
            <small>Choose one clear photo of the component.</small>
          </label>
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Selected product preview" />
            </div>
          )}
          <button className="publish-button" type="submit" disabled={saving || loadingCategories || loadingSpecs || categories.length === 0}>
            {loadingCategories ? "LOADING CATEGORIES…" : loadingSpecs ? "LOADING SPECS…" : saving ? "SAVING…" : "SAVE LISTING ↗"}
          </button>
        </form>
      </section>
    </main>
  );
}
