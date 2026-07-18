import { useEffect, useState } from 'react';
import { categoryAPI } from '../services/api';

export default function CategoriesManager({ isOpen, onClose, onRefresh }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoryAPI.getCategories();
      setCategories(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    try {
      setError(null);
      await categoryAPI.createCategory(newCategoryName);
      setNewCategoryName('');
      await fetchCategories();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    try {
      setError(null);
      await categoryAPI.updateCategory(editingId, editingName);
      setEditingId(null);
      setEditingName('');
      await fetchCategories();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure? This will affect transactions in this category.')) {
      return;
    }

    try {
      setError(null);
      await categoryAPI.deleteCategory(id);
      await fetchCategories();
      onRefresh?.();
    } catch (err) {
      if (err.message.includes('409') || err.message.includes('Conflict')) {
        setError('Cannot delete category - it has associated transactions. Edit those transactions first.');
      } else {
        setError(err.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Manage Categories</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleAddCategory} className="mb-6 pb-6 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">Add New Category</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
          {loading ? (
            <p className="text-gray-600 text-sm">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="text-gray-600 text-sm">No categories yet</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateCategory}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-gray-300 text-gray-900 rounded text-xs hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-gray-900 text-sm">{cat.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditingName(cat.name);
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
