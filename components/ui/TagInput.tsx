import React, { useState } from 'react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (newTags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onTagsChange, placeholder = "Add a value and press Enter" }) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm">
      {tags.map((tag, index) => (
        <div key={index} className="flex items-center bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-2 text-gray-500 hover:text-gray-800 font-bold"
            aria-label={`Remove ${tag}`}
          >
            &times;
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-grow bg-transparent focus:outline-none focus:ring-0 border-none p-1 text-sm"
      />
    </div>
  );
};

export default TagInput;
