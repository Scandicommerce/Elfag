import React, { useState, useEffect } from 'react';
import { ContactButton } from './ContactButton';
import { useAuth } from '../contexts/AuthContext';
import { Resource } from '../types';
import { Check, Clock, X, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResourceTableProps {
  title: string;
  resources: Resource[];
  onMessageSent?: () => void;
  showStatus?: boolean;
  showActions?: boolean;
}

interface ContactInfo {
  company_name: string;
  email: string;
  phone: string;
  address: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  from_company: {
    anonymous_id: string;
  };
}

export const ResourceTable: React.FC<ResourceTableProps> = ({ 
  title, 
  resources, 
  onMessageSent,
  showStatus = false,
  showActions = false
}) => {
  const { user } = useAuth();
  const [contactInfo, setContactInfo] = useState<Record<string, ContactInfo>>({});
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Record<string, Message[]>>({});
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  useEffect(() => {
    if (user) {
      loadUserCompany();
    }
  }, [user]);

  useEffect(() => {
    if (userCompanyId) {
      loadContactInfo();
      loadPendingRequests();
    }
  }, [userCompanyId, resources]);

  const loadUserCompany = async () => {
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (company) {
        setUserCompanyId(company.id);
      }
    } catch (error) {
      console.error('Error loading user company:', error);
    }
  };

  const loadPendingRequests = async () => {
    if (!userCompanyId) return;

    try {
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          resource_id,
          from_company:from_company_id(
            anonymous_id
          )
        `)
        .eq('to_company_id', userCompanyId)
        .is('thread_id', null)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      if (messages) {
        const grouped = messages.reduce((acc: Record<string, Message[]>, msg) => {
          const fromCompany = Array.isArray(msg.from_company) 
            ? msg.from_company[0] 
            : msg.from_company;
          
          if (!acc[msg.resource_id]) {
            acc[msg.resource_id] = [];
          }
          
          const formattedMessage: Message = {
            id: msg.id,
            content: msg.content,
            created_at: msg.created_at,
            from_company: fromCompany
          };
          
          acc[msg.resource_id].push(formattedMessage);
          return acc;
        }, {});
        setPendingRequests(grouped);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadContactInfo = async () => {
    if (!userCompanyId) return;

    const acceptedResources = resources.filter(r => r.is_taken);
    
    for (const resource of acceptedResources) {
      try {
        // Get the initial message for this resource
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('resource_id', resource.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (messages) {
          // Check if contact info is shared
          const { data: sharing } = await supabase
            .from('thread_contact_sharing')
            .select(`
              *,
              from_company:from_company_id(
                id,
                real_contact_info
              ),
              to_company:to_company_id(
                id,
                real_contact_info
              )
            `)
            .eq('thread_id', messages.id);

          
          if (sharing && sharing.length > 0) {
            // Find company data from any record that has it
            let otherCompany = null;
            
            for (const record of sharing) {
              if (record.from_company) {
                const fromCompany = Array.isArray(record.from_company) 
                  ? record.from_company[0] 
                  : record.from_company;
                
                if (fromCompany.id !== userCompanyId) {
                  otherCompany = fromCompany;
                  break;
                }
              }
              
              if (record.to_company) {
                const toCompany = Array.isArray(record.to_company) 
                  ? record.to_company[0] 
                  : record.to_company;
                
                if (toCompany.id !== userCompanyId) {
                  otherCompany = toCompany;
                  break;
                }
              }
            }

            if (otherCompany?.real_contact_info) {
              setContactInfo(prev => ({
                ...prev,
                [resource.id]: otherCompany.real_contact_info
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error loading contact info:', error);
      }
    }
  };

  const handleAcceptResource = async (resourceId: string) => {
    if (!userCompanyId) return;

    try {
      setLoading(true);
      await supabase.rpc('accept_resource', {
        p_resource_id: resourceId,
        p_accepting_company_id: userCompanyId
      });

      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('Error accepting resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price?: number, priceType?: string) => {
    if (!price && priceType !== 'negotiable') return 'Ikke spesifisert';
    if (priceType === 'negotiable') return 'Etter avtale';
    return `${price} kr${priceType === 'hourly' ? '/time' : ''}`;
  };

  const getStatusInfo = (resource: Resource) => {
    if (resource.is_taken) {
      const info = contactInfo[resource.id];
      return {
        icon: info ? <Check className="w-4 h-4 text-green-600" /> : <MessageSquare className="w-4 h-4 text-blue-600" />,
        text: info ? 'Avtale inngått' : 'Venter på godkjenning',
        color: info ? 'text-green-600' : 'text-blue-600'
      };
    }
    if (pendingRequests[resource.id]?.length > 0) {
      return {
        icon: <Clock className="w-4 h-4 text-yellow-600" />,
        text: `${pendingRequests[resource.id].length} ny${pendingRequests[resource.id].length > 1 ? 'e' : ''} forespørsel${pendingRequests[resource.id].length > 1 ? 'er' : ''}`,
        color: 'text-yellow-600'
      };
    }
    if (new Date(resource.period.to) < new Date()) {
      return {
        icon: <X className="w-4 h-4 text-red-600" />,
        text: 'Utløpt',
        color: 'text-red-600'
      };
    }
    return {
      icon: <Clock className="w-4 h-4 text-blue-600" />,
      text: 'Aktiv',
      color: 'text-blue-600'
    };
  };

  const renderAction = (resource: Resource) => {
    const status = getStatusInfo(resource);
    const isMyResource = resource.company_id === userCompanyId;
    const hasPendingRequests = pendingRequests[resource.id]?.length > 0;
    const canAccept = !resource.is_taken && resource.price && !isMyResource;

    if (isMyResource && hasPendingRequests && !resource.is_taken) {
      return (
        <div className="space-y-2">
          <button
            onClick={() => {
              setSelectedResource(resource.id);
              setShowMessages(true);
            }}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <MessageSquare className="w-4 h-4" />
            Vis forespørsler ({pendingRequests[resource.id].length})
          </button>
          {selectedResource === resource.id && showMessages && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Forespørsler for {resource.competence}</h3>
                  <button
                    onClick={() => setShowMessages(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  {pendingRequests[resource.id].map((msg) => (
                    <div key={msg.id} className="border rounded p-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-2">
                        <span>Fra: {msg.from_company.anonymous_id}</span>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mb-4">{msg.content}</p>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAcceptResource(resource.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Godkjenn forespørsel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (canAccept && showActions) {
      return (
        <button
          onClick={() => handleAcceptResource(resource.id)}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {loading ? 'Behandler...' : 'Godkjenn'}
        </button>
      );
    }

    if (!resource.is_taken && !isMyResource) {
      return (
        <ContactButton 
          resource={resource} 
          onMessageSent={onMessageSent}
        />
      );
    }

    return null;
  };

  return (
    <div className="bg-white border-2 border-elfag-dark rounded shadow-industrial">
      <div className="bg-elfag-light p-3">
        <h2 className="text-xl font-bold text-elfag-dark">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b-2 border-elfag-dark">
              <th className="p-3 text-left">Kompetanse</th>
              <th className="p-3 text-left">Antall</th>
              <th className="p-3 text-left">Pris</th>
              <th className="p-3 text-left">Periode</th>
              <th className="p-3 text-left">Kommentar</th>
              <th className="p-3 text-left">Bedrift</th>
              {showStatus && <th className="p-3 text-left">Status</th>}
              <th className="p-3 text-left">Handling</th>
            </tr>
          </thead>
          <tbody>
            {resources.length === 0 ? (
              <tr>
                <td colSpan={showStatus ? 8 : 7} className="p-4 text-center text-gray-500">
                  Ingen tilgjengelige ressurser
                </td>
              </tr>
            ) : (
              resources.map((resource) => {
                const status = getStatusInfo(resource);
                const info = contactInfo[resource.id];
                
                return (
                  <tr key={resource.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3">{resource.competence}</td>
                    <td className="p-3">1</td>
                    <td className="p-3">{formatPrice(resource.price, resource.priceType)}</td>
                    <td className="p-3">
                      {new Date(resource.period.from).toLocaleDateString()} - {new Date(resource.period.to).toLocaleDateString()}
                    </td>
                    <td className="p-3">{resource.comments}</td>
                    <td className="p-3">
                      {info ? (
                        <div className="space-y-1">
                          <p className="font-semibold">{info.company_name}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4" />
                            <span>{info.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4" />
                            <span>{info.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{info.address}</span>
                          </div>
                        </div>
                      ) : (
                        resource.anonymId
                      )}
                    </td>
                    {showStatus && (
                      <td className="p-3">
                        <div className={`flex items-center gap-2 ${status.color}`}>
                          {status.icon}
                          <span>{status.text}</span>
                        </div>
                      </td>
                    )}
                    <td className="p-3">
                      {renderAction(resource)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};