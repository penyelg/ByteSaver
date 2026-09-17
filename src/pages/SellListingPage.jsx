import React, { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fallbackCategories } from './MarketplacePage'
import './SellListingPage.css'

const categorySpecs = {
  CPU: [
    { key: 'socket', label: 'Socket', placeholder: 'e.g. AM4' },
    { key: 'cores', label: 'Cores', placeholder: 'e.g. 6' },
    { key: 'threads', label: 'Threads', placeholder: 'e.g. 12' },
  ],
  GPU: [
    { key: 'vram', label: 'VRAM', placeholder: 'e.g. 12GB' },
    { key: 'memory_type', label: 'Memory type', placeholder: 'e.g. GDDR6' },
    { key: 'power_requirement', label: 'Power requirement', placeholder: 'e.g. 170W' },
  ],
  RAM: [
    { key: 'capacity', label: 'Capacity', placeholder: 'e.g. 16GB' },
    { key: 'generation', label: 'Generation', placeholder: 'e.g. DDR4' },
    { key: 'speed', label: 'Speed', placeholder: 'e.g. 3200MHz' },
  ],
  Motherboard: [
    { key: 'socket', label: 'Socket', placeholder: 'e.g. AM4' },
    { key: 'chipset', label: 'Chipset', placeholder: 'e.g. B550' },
    { key: 'form_factor', label: 'Form factor', placeholder: 'e.g. ATX' },
  ],
  Storage: [
    { key: 'capacity', label: 'Capacity', placeholder: 'e.g. 1TB' },
    { key: 'storage_type', label: 'Type', placeholder: 'e.g. NVMe SSD' },
    { key: 'interface', label: 'Interface', placeholder: 'e.g. PCIe 3.0' },
  ],
  'Power Supply': [
    { key: 'wattage', label: 'Wattage', placeholder: 'e.g. 750W' },
    { key: 'efficiency', label: 'Efficiency rating', placeholder: 'e.g. 80+ Gold' },
    { key: 'modular', label: 'Modular type', placeholder: 'e.g. Fully modular' },
  ],
  Monitor: [
    { key: 'screen_size', label: 'Screen size', placeholder: 'e.g. 24 inches' },
    { key: 'resolution', label: 'Resolution', placeholder: 'e.g. 1920x1080' },
    { key: 'refresh_rate', label: 'Refresh rate', placeholder: 'e.g. 144Hz' },
  ],
  Peripherals: [
    { key: 'connection', label: 'Connection type', placeholder: 'e.g. USB-C' },
    { key: 'compatibility', label: 'Compatibility', placeholder: 'e.g. Windows / Mac' },
    { key: 'included', label: 'Included accessories', placeholder: 'e.g. Cable, case' },
  ],
}

export default function SellListingPage({ session, onBack }) {
  const [form, setForm] = useState({ brand: '', model: '', category: 'CPU', price: '', condition: 'Good', description: '', image: null })
  const [specs, setSpecs] = useState({})
  const [imagePreview, setImagePreview] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const updateForm = (event) => {
    const { name, value, files } = event.target
    if (name === 'image') {
      const file = files?.[0] || null
      setForm((current) => ({ ...current, image: file }))
      setImagePreview(file ? URL.createObjectURL(file) : '')
      return
    }
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'category') setSpecs({})
  }

  const updateSpec = (event) => {
    const { name, value } = event.target
    setSpecs((current) => ({ ...current, [name]: value }))
  }

  const saveListing = async (event) => {
    event.preventDefault()
    if (!supabase) return setNotice('Supabase is not configured.')
    setSaving(true)
    try {
      const extension = form.image.name.split('.').pop()?.toLowerCase() || 'jpg'
      const imagePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`
      const upload = await supabase.storage.from('listing-images').upload(imagePath, form.image, { contentType: form.image.type, upsert: false })
      if (upload.error) throw upload.error
      const imageUrl = supabase.storage.from('listing-images').getPublicUrl(imagePath).data.publicUrl
      const { error } = await supabase.from('listings').insert({
        seller_id: session.user.id,
        brand: form.brand.trim(),
        model: form.model.trim(),
        category: form.category,
        price: Number(form.price),
        condition: form.condition,
        description: form.description.trim(),
        image_url: imageUrl,
        specs,
      })
      if (error) throw error
      onBack()
    } catch (error) {
      setNotice(`Unable to save listing: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const selectedSpecs = categorySpecs[form.category] || []

  return <main className="sell-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> BACK TO MARKETPLACE</button>
    <section className="sell-page-panel">
      <span className="section-index">MARKETPLACE / 02</span>
      <h1>List your hardware.</h1>
      <p>Enter the basic details and a clear product photo.</p>
      {notice && <div className="sell-notice sell-notice--error">{notice}</div>}
      <form className="listing-form" onSubmit={saveListing}>
        <label>Brand<input name="brand" value={form.brand} onChange={updateForm} required placeholder="e.g. AMD" /></label>
        <label>Model<input name="model" value={form.model} onChange={updateForm} required placeholder="e.g. Ryzen 5 5600X" /></label>
        <label>Category<select name="category" value={form.category} onChange={updateForm}>{fallbackCategories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Price (₱)<input name="price" type="number" min="1" step="0.01" value={form.price} onChange={updateForm} required placeholder="5850" /></label>
        <label>Condition<select name="condition" value={form.condition} onChange={updateForm}><option>Like new</option><option>Excellent</option><option>Good</option><option>Fair</option></select></label>
        {selectedSpecs.map((spec) => <label key={spec.key}>{spec.label}<input name={spec.key} value={specs[spec.key] || ''} onChange={updateSpec} required placeholder={spec.placeholder} /></label>)}
        <label className="listing-form-wide">Description<textarea name="description" value={form.description} onChange={updateForm} required rows="5" placeholder="Describe usage, testing, included accessories, and flaws." /></label>
        <label className="listing-form-wide">Product photo<input name="image" type="file" accept="image/*" onChange={updateForm} required /><small>Choose one clear photo of the component.</small></label>
        {imagePreview && <div className="image-preview"><img src={imagePreview} alt="Selected product preview" /></div>}
        <button className="publish-button" type="submit" disabled={saving}>{saving ? 'SAVING…' : 'SAVE LISTING ↗'}</button>
      </form>
    </section>
  </main>
}
