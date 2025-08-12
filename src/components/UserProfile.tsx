import React, { useState, useEffect } from 'react';
import { User, Building, Mail, Phone, MapPin, Edit3, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CompanyInfo {
  id: string;
  name: string;
  anonymous_id: string;
  real_contact_info: {
    company_name: string;
    email: string;
    phone: string;
    address: string;
  };
}

export const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCompanyInfo();
    }
  }, [user]);

  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setCompany(data);
      setEditForm(data.real_contact_info || {
        company_name: data.name,
        email: '',
        phone: '',
        address: ''
      });
    } catch (err) {
      console.error('Error loading company info:', err);
      setError('Kunne ikke laste bedriftsinformasjon');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('companies')
        .update({
          name: editForm.company_name,
          real_contact_info: editForm
        })
        .eq('id', company.id);

      if (error) throw error;

      await loadCompanyInfo();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating company info:', err);
      setError('Kunne ikke oppdatere bedriftsinformasjon');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(company?.real_contact_info || {
      company_name: company?.name || '',
      email: '',
      phone: '',
      address: ''
    });
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded border-2 border-elfag-dark shadow-modern">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elfag-dark"></div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-white p-6 rounded border-2 border-elfag-dark shadow-modern">
        <div className="text-center py-8">
          <p className="text-gray-500">Ingen bedriftsinformasjon funnet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded border-2 border-elfag-dark shadow-modern">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <User className="w-8 h-8 text-elfag-dark" />
          <h2 className="text-2xl font-bold">Min Side</h2>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-elfag-dark border border-elfag-dark rounded hover:bg-elfag-light hover:text-white transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Rediger
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-elfag-dark text-white rounded hover:bg-elfag-light transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Lagrer...' : 'Lagre'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Avbryt
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building className="w-5 h-5 text-elfag-dark" />
            Bedriftsinformasjon
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bedriftsnavn
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.company_name}
                onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
              />
            ) : (
              <p className="p-3 bg-gray-50 rounded border">{company.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anonym ID (Offentlig)
            </label>
            <p className="p-3 bg-gray-50 rounded border text-elfag-dark font-mono">
              {company.anonymous_id}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-elfag-dark" />
            Kontaktinformasjon
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-post
            </label>
            {isEditing ? (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
              />
            ) : (
              <p className="p-3 bg-gray-50 rounded border">{editForm.email || 'Ikke oppgitt'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
              />
            ) : (
              <p className="p-3 bg-gray-50 rounded border">{editForm.phone || 'Ikke oppgitt'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            {isEditing ? (
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
              />
            ) : (
              <p className="p-3 bg-gray-50 rounded border min-h-[80px]">{editForm.address || 'Ikke oppgitt'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-elfag-bg rounded">
        <h3 className="font-semibold mb-2">Brukerinformasjon</h3>
        <p className="text-sm text-gray-600">
          <strong>E-post:</strong> {user?.email}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Bruker ID:</strong> {user?.id}
        </p>
      </div>
    </div>
  );
}; 