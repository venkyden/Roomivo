import React, { useState } from 'react';
import ImageUpload from './ImageUpload';

const CreateProperty = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [rooms, setRooms] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const submissionData = {
        title,
        description,
        city,
        price: parseFloat(price),
        rooms: parseInt(rooms),
        amenities,
        images: images.map(img => ({
          url: img.url,
          publicId: img.publicId
        }))
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        alert('Property created successfully!');
        setTitle('');
        setDescription('');
        setCity('');
        setPrice('');
        setRooms('');
        setAmenities([]);
        setImages([]);
      } else {
        alert('Failed to create property');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-property-container">
      <h2>Create Property Listing</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>City</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Price</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Rooms</label>
          <input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} required />
        </div>

        <ImageUpload images={images} onImagesChange={setImages} maxImages={10} />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Property'}
        </button>
      </form>
    </div>
  );
};

export default CreateProperty;
