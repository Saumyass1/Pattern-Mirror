import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  label: string;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  files, 
  onFilesChange, 
  accept = "image/png, image/jpeg",
  maxFiles = 5 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));

      // Append new files, respecting max limit
      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      onFilesChange(updatedFiles);
    }
    // Reset input so same file can be selected again if needed (though UI handles deletion)
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeFile = (indexToRemove: number) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    onFilesChange(updatedFiles);
    // Cleanup object URL to avoid memory leaks
    URL.revokeObjectURL(files[indexToRemove].previewUrl);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {files.map((fileData, index) => (
          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
            <img 
              src={fileData.previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover" 
            />
            <button
              onClick={() => removeFile(index)}
              className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {files.length < maxFiles && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-50 transition-all text-stone-400 hover:text-stone-600"
          >
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Add Photo</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={accept}
        multiple
        className="hidden"
      />
      
      <p className="text-xs text-stone-500">
        {files.length} / {maxFiles} images selected
      </p>
    </div>
  );
};

export default FileUpload;