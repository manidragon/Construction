import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import {
  PlusCircle,
  X,
  Check,
  Loader2,
  Edit2,
  Trash2,
  Settings2,
  Sparkles,
  AlertCircle,
  Search,
} from 'lucide-react';

export interface DropdownItem {
  id?: string;
  label: string;
  value: string;
  isCustom?: boolean;
}

interface DynamicSelectProps {
  category: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  showAddOption?: boolean;
  fallbackOptions?: DropdownItem[];
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  category,
  value,
  onChange,
  label,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  required = false,
  id,
  showAddOption = true,
  fallbackOptions = [],
}) => {
  const [options, setOptions] = useState<DropdownItem[]>(fallbackOptions);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValueCode, setNewValueCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state for an individual option
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [isUpdatingOption, setIsUpdatingOption] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load dropdown options from backend
  const loadOptions = async () => {
    try {
      setLoading(true);
      const res = await api.getDropdowns(category);
      if (res.success && Array.isArray(res.data)) {
        setOptions(res.data);
      }
    } catch (err) {
      console.warn(`Failed to fetch options for ${category}, using fallbacks:`, err);
      if (fallbackOptions.length > 0) {
        setOptions(fallbackOptions);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();

    const handleOptionsChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      const changedCat = customEvent.detail?.category;
      if (
        !changedCat ||
        changedCat === category ||
        ((category === 'ServiceType' || category === 'ProjectType') &&
          (changedCat === 'ServiceType' || changedCat === 'ProjectType'))
      ) {
        loadOptions();
      }
    };

    window.addEventListener('dropdown_options_changed', handleOptionsChanged);
    return () => {
      window.removeEventListener('dropdown_options_changed', handleOptionsChanged);
    };
  }, [category]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__ADD_NEW_OPTION__' || selected === '__MANAGE_OPTIONS__') {
      setShowModal(true);
      setNewLabel('');
      setNewValueCode('');
      setErrorMsg(null);
      setSuccessMsg(null);
      return;
    }
    onChange(selected);
  };

  // Add new option - NEVER uses form submit, safe from bubbling to parent forms
  const handleSaveNewOption = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newLabel.trim()) {
      setErrorMsg('Please enter a valid option label.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const generatedCode =
        newValueCode.trim() ||
        newLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

      const res = await api.createDropdownOption({
        category,
        label: newLabel.trim(),
        value: generatedCode,
      });

      if (res.success && res.data) {
        const createdItem: DropdownItem = {
          id: res.data.id,
          label: res.data.label,
          value: res.data.value,
          isCustom: true,
        };

        // Add to list and immediately select
        setOptions((prev) => {
          const exists = prev.some(
            (o) => o.value.toUpperCase() === createdItem.value.toUpperCase()
          );
          return exists ? prev : [...prev, createdItem];
        });

        onChange(createdItem.value);
        setNewLabel('');
        setNewValueCode('');
        setSuccessMsg(`"${createdItem.label}" added and selected!`);

        window.dispatchEvent(
          new CustomEvent('dropdown_options_changed', { detail: { category } })
        );

        setTimeout(() => {
          setShowModal(false);
          setSuccessMsg(null);
        }, 800);
      } else {
        setErrorMsg(res.message || 'Failed to save new option');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  // Start editing an existing option
  const handleStartEdit = (opt: DropdownItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingOptionId(opt.id || opt.value);
    setEditingLabel(opt.label);
    setErrorMsg(null);
  };

  // Save edited option
  const handleSaveEdit = async (opt: DropdownItem, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingLabel.trim()) {
      setErrorMsg('Label cannot be empty.');
      return;
    }

    try {
      setIsUpdatingOption(true);
      setErrorMsg(null);

      const targetId = opt.id || opt.value;
      const res = await api.updateDropdownOption(targetId, {
        label: editingLabel.trim(),
        value: opt.value,
        category,
      });

      if (res.success) {
        setOptions((prev) =>
          prev.map((item) =>
            (item.id === targetId || item.value === opt.value)
              ? { ...item, label: editingLabel.trim() }
              : item
          )
        );

        setEditingOptionId(null);
        setEditingLabel('');
        setSuccessMsg(`Updated option to "${editingLabel.trim()}"`);
        setTimeout(() => setSuccessMsg(null), 2000);

        window.dispatchEvent(
          new CustomEvent('dropdown_options_changed', { detail: { category } })
        );
      } else {
        setErrorMsg(res.message || 'Failed to update option');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating option');
    } finally {
      setIsUpdatingOption(false);
    }
  };

  // Delete option
  const handleDeleteOption = async (opt: DropdownItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!opt.id) return;
    if (!window.confirm(`Delete option "${opt.label}"?`)) return;

    try {
      const res = await api.deleteDropdownOption(opt.id);
      if (res.success) {
        setOptions((prev) => prev.filter((item) => item.id !== opt.id));
        if (value === opt.value) {
          onChange('');
        }
        window.dispatchEvent(
          new CustomEvent('dropdown_options_changed', { detail: { category } })
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete option');
    }
  };

  const categoryTitle =
    category === 'ServiceType' || category === 'ProjectType'
      ? 'Project Types'
      : category === 'LeadSource'
      ? 'Lead Sources'
      : category;

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="flex items-center space-x-1.5 relative">
        <div className="relative flex-1">
          <select
            id={id}
            value={value}
            onChange={handleSelectChange}
            disabled={disabled || loading}
            required={required}
            className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
          >
            {placeholder && <option value="">{placeholder}</option>}

            {options.map((opt) => (
              <option key={opt.id || opt.value} value={opt.value}>
                {opt.label} {opt.isCustom ? '★' : ''}
              </option>
            ))}

            {showAddOption && (
              <>
                <option
                  value="__ADD_NEW_OPTION__"
                  className="text-amber-600 font-bold bg-amber-50 py-1"
                >
                  ➕ + Add New Option...
                </option>
                <option
                  value="__MANAGE_OPTIONS__"
                  className="text-slate-700 font-bold bg-slate-100 py-1"
                >
                  ⚙️ Manage / Edit Types...
                </option>
              </>
            )}
          </select>

          {loading && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            </div>
          )}
        </div>

        {/* Quick Edit/Manage Button beside dropdown */}
        {showAddOption && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowModal(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="flex items-center space-x-1 px-2.5 py-2 border border-amber-300 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition shadow-xs shrink-0"
            title={`Manage & edit ${categoryTitle}`}
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Edit / + Add</span>
          </button>
        )}
      </div>

      {/* Quick-Modal to Add or Edit Options - rendered via Portal to prevent any parent form interference */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Manage {categoryTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add new options or edit existing ones. Changes persist across all forms.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowModal(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Alert Messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Add New Option Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
                  + Add New {categoryTitle.slice(0, -1) || 'Option'}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`e.g. Luxury Penthouse, Turnkey Fitout, Industrial Civil...`}
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value);
                      if (!newValueCode) {
                        setNewValueCode(
                          e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_')
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveNewOption(e);
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSaveNewOption(e)}
                    disabled={saving || !newLabel.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add & Select</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Filter Search for Options */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter existing options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* List of Existing Options with Edit Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Existing {categoryTitle} ({options.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Click <strong>Edit (✏️)</strong> to rename any project type
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50/50">
                  {options
                    .filter((opt) => !searchTerm || opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((opt) => {
                      const isSelected = value === opt.value;
                      const isEditing = editingOptionId === (opt.id || opt.value);

                      return (
                        <div
                          key={opt.id || opt.value}
                          className={`p-2.5 flex items-center justify-between transition ${
                            isSelected ? 'bg-amber-50/80 font-bold' : 'hover:bg-white'
                          }`}
                        >
                          {isEditing ? (
                            /* Inline Edit Mode */
                            <div className="flex items-center space-x-2 flex-1 mr-2">
                              <input
                                type="text"
                                autoFocus
                                value={editingLabel}
                                onChange={(e) => setEditingLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSaveEdit(opt, e);
                                  } else if (e.key === 'Escape') {
                                    setEditingOptionId(null);
                                  }
                                }}
                                className="flex-1 px-2.5 py-1 text-xs border border-amber-400 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={(e) => handleSaveEdit(opt, e)}
                                disabled={isUpdatingOption}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-xs font-bold flex items-center space-x-1"
                                title="Save changes"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingOptionId(null);
                                }}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition text-xs"
                                title="Cancel editing"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            /* Display Mode with Edit Button */
                            <>
                              <div className="flex items-center space-x-2 min-w-0">
                                <span
                                  className={`text-xs truncate ${
                                    isSelected ? 'text-amber-950 font-bold' : 'text-slate-800 font-medium'
                                  }`}
                                >
                                  {opt.label}
                                </span>
                                {opt.isCustom && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold uppercase">
                                    Custom
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-bold uppercase">
                                    Selected
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0">
                                {/* Dedicated Edit Button at the end of each option */}
                                <button
                                  type="button"
                                  onClick={(e) => handleStartEdit(opt, e)}
                                  className="px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 rounded-lg transition font-medium flex items-center space-x-1 border border-amber-200 bg-amber-50"
                                  title="Edit / Rename this option"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                {/* Delete Button (for custom options) */}
                                {opt.id && opt.isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteOption(opt, e)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete option"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Quick Select Button */}
                                {!isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onChange(opt.value);
                                      setShowModal(false);
                                    }}
                                    className="px-2.5 py-1 text-xs bg-slate-200 hover:bg-amber-500 hover:text-slate-950 text-slate-700 font-bold rounded-lg transition ml-1"
                                  >
                                    Select
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Options sync instantly for all team members
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition shadow-xs"
              >
                Close & Return to Form
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DynamicSelect;
