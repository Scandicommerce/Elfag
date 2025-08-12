import React, { useState } from 'react';
import { MessageSquare, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Resource } from '../types';

interface ContactButtonProps {
  resource: Resource;
  onMessageSent?: () => void;
}

const getResourceTypeText = (resourceType: Resource['resourceType']) => {
  switch (resourceType) {
    case 'available_staffing':
      return 'tilgjengelig bemanning';
    case 'want_staffing':
      return 'forespørsel om bemanning';
    case 'special_competence':
      return 'spesialkompetanse';
    case 'special_tools':
      return 'spesialverktøy';
  }
};

export const ContactButton: React.FC<ContactButtonProps> = ({ resource, onMessageSent }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !resource.company_id) return;
    
    try {
      setSending(true);
      setError('');

      // Get the user's company
      const { data: fromCompany, error: fromCompanyError } = await supabase
        .from('companies')
        .select('id, real_contact_info')
        .eq('user_id', user.id)
        .single();

      if (fromCompanyError) {
        console.error('Error fetching sender company:', fromCompanyError);
        throw new Error('Kunne ikke finne din bedrift. Vennligst kontakt support.');
      }

      if (fromCompany.id === resource.company_id) {
        throw new Error('Du kan ikke sende melding til din egen bedrift');
      }

      const resourceTypeText = getResourceTypeText(resource.resourceType);
      
      // Create initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          from_company_id: fromCompany.id,
          to_company_id: resource.company_id,
          resource_id: resource.id,
          subject: `Interessert i ${resourceTypeText}: ${resource.competence}`,
          content: message,
          offeror_email: fromCompany.real_contact_info?.email || null
        });

      if (messageError) {
        console.error('Error sending message:', messageError);
        throw new Error('Kunne ikke sende meldingen. Vennligst prøv igjen.');
      }

      setSent(true);
      onMessageSent?.();
      
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
        setMessage('');
      }, 1500);

    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'En feil oppstod ved sending av melding');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setIsOpen(false);
    setMessage('');
    setError('');
    setSent(false);
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Check className="w-4 h-4" />
        <span>Melding sendt!</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1 text-sm bg-elfag-dark text-white rounded hover:bg-elfag-light transition-colors"
      >
        <MessageSquare className="w-3 h-3" />
        Send melding
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Send melding</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Angående: <span className="font-medium">{resource.competence}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Til: <span className="font-mono">{resource.anonymId}</span>
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Din melding
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-elfag-light focus:border-transparent resize-none"
                    placeholder={`Hei! Jeg er interessert i deres ${getResourceTypeText(resource.resourceType)}...`}
                    required
                    disabled={sending}
                  />
                </div>

                <div className="bg-elfag-bg p-3 rounded text-xs text-gray-600">
                  <p className="font-medium mb-1">ℹ️ Viktig informasjon:</p>
                  <ul className="space-y-1">
                    <li>• Din melding blir sendt anonymt</li>
                    <li>• Kontaktinformasjon deles kun ved aksept</li>
                    <li>• Vær profesjonell og konkret i din henvendelse</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="flex-1 bg-elfag-dark text-white py-2 px-4 rounded hover:bg-elfag-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sender...' : 'Send melding'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 