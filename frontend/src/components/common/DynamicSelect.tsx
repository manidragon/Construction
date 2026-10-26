import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PlusCircle, X, Check, Loader2, Sparkles } from 'lucide-react';

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
  }, [category]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__ADD_NEW_OPTION__') {
      setShowModal(true);
      setNewLabel('');
      setNewValueCode('');
      setErrorMsg(null);
      return;
    }
    onChange(selected);
  };

  const handleSaveNewOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      setErrorMsg('Please enter a valid option label.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

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

        // Add to list and immediately select without reload
        setOptions((prev) => {
          const exists = prev.some((o) => o.value.toUpperCase() === createdItem.value.toUpperCase());
          return exists ? prev : [...prev, createdItem];
        });

        onChange(createdItem.value);
        setShowModal(false);
      } else {
        setErrorMsg(res.message || 'Failed to save new option');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
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
            <option
              value="__ADD_NEW_OPTION__"
              className="text-amber-400 font-bold bg-amber-950/80 py-1"
            >
              ➕ + Add New Option...
            </option>
          )}
        </select>

        {loading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Inline Quick-Modal to Add New Option Instantly */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-100">
                    Add New Option
                  </h3>
                  <p className="text-xs text-slate-400">
                    Category: <span className="font-mono text-amber-400 font-semibold">{category}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewOption} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Option Name / Label <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={`e.g. VIP Referral, Penthouse Fitout...`}
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    if (!newValueCode) {
                      setNewValueCode(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_')
                      );
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                  <span>Internal Code / Value (Optional)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Auto-generated</span>
                </label>
                <input
                  type="text"
                  placeholder="CUSTOM_CODE"
                  value={newValueCode}
                  onChange={(e) => setNewValueCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newLabel.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save & Select
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicSelect;
