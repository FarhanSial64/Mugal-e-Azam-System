import { useState, useRef } from 'react';
import { CameraIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { getApiOrigin } from '../../services/api';

const ProfilePhoto = ({ 
  photoUrl, 
  name, 
  size = 'md', 
  editable = false, 
  onUpload, 
  onDelete,
  uploading = false,
}) => {
  const fileInputRef = useRef(null);
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-11 h-11 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-32 h-32 text-4xl',
  };

  const getInitial = () => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const getPhotoSrc = () => {
    if (!photoUrl) return null;
    // If it's a relative URL, prepend BASE URL
    if (photoUrl.startsWith('/')) {
      return `${getApiOrigin()}${photoUrl}`;
    }
    return photoUrl;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const photoSrc = getPhotoSrc();
  const showPhoto = photoSrc && !imageError;

  return (
    <div className="relative inline-block">
      {/* Photo/Avatar */}
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full flex items-center justify-center overflow-hidden
          ${editable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
          ${uploading ? 'opacity-50' : ''}
          ${showPhoto ? '' : 'bg-primary-600 text-white'}
        `}
        onClick={handleClick}
      >
        {showPhoto ? (
          <img
            src={photoSrc}
            alt={name || 'Profile'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="font-semibold">{getInitial()}</span>
        )}
      </div>

      {/* Edit overlay for editable mode */}
      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Camera icon overlay */}
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className={`
              absolute bottom-0 right-0 
              bg-primary-600 text-white rounded-full p-1.5
              hover:bg-primary-700 transition-colors
              shadow-lg border-2 border-white
              ${size === 'sm' ? 'scale-75' : ''}
            `}
            aria-label="Upload profile photo"
          >
            <CameraIcon className="w-4 h-4" />
          </button>

          {/* Delete button (only show if there's a photo) */}
          {showPhoto && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={uploading}
              className={`
                absolute top-0 right-0 
                bg-red-600 text-white rounded-full p-1
                hover:bg-red-700 transition-colors
                shadow-lg border-2 border-white
                ${size === 'sm' ? 'scale-75' : ''}
              `}
              aria-label="Delete profile photo"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          )}
        </>
      )}

      {/* Loading spinner */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ProfilePhoto;
