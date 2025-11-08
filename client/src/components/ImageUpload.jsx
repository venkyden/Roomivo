import React, { useState } from 'react';
import '../styles/ImageUpload.css';

const ImageUpload = ({ images, onImagesChange, maxImages = 10 }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const token = localStorage.getItem('token');
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/images/upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          }
        );

        if (response.ok) {
          const data = await response.json();
          onImagesChange([
            ...images,
            {
              url: data.imageUrl,
              publicId: data.publicId,
              name: file.name
            }
          ]);
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        } else {
          alert(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Error uploading ${file.name}`);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = async (image) => {
    try {
      const token = localStorage.getItem('token');
      
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/images/delete/${image.publicId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      onImagesChange(images.filter(img => img.publicId !== image.publicId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    }
  };

  return (
    <div className="image-upload-container">
      <h3>Property Images ({images.length}/{maxImages})</h3>
      
      <div className="upload-area">
        <label htmlFor="image-input" className="upload-label">
          {uploading ? 'Uploading...' : 'Click to select images or drag & drop'}
        </label>
        <input
          id="image-input"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          className="file-input"
        />
      </div>

      <div className="images-preview">
        {images.map((image, index) => (
          <div key={index} className="image-item">
            <img src={image.url} alt={`Preview ${index}`} />
            <button
              type="button"
              onClick={() => handleRemoveImage(image)}
              className="remove-btn"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUpload;
