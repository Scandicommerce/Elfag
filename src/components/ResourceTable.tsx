import React, { useState, useEffect } from 'react';
import { ContactButton } from './ContactButton';
import { useAuth } from '../contexts/AuthContext';
import { Resource } from '../types';
import { Check, Clock, X, Phone, Mail, MapPin, MessageSquare, Users, User, Wrench, Eye, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResourceTableProps {
  title: string;
  resources: Resource[];
  onMessageSent?: () => void;
  onResourceClick?: (resource: Resource) => void;
  showStatus?: boolean;
  showActions?: boolean;
  showCompactView?: boolean;
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

const getResourceTypeInfo = (resourceType: Resource['resourceType']) => {
  // Handle both old and new schema
  switch (resourceType) {
    case 'available_staffing':
      return { 
        icon: Users, 
        title: 'Tilgjengelig Bemanning',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    case 'want_staffing':
      return { 
        icon: User, 
        title: 'Ønsker Bemanning',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    case 'special_competence':
      return { 
        icon: Clock, 
        title: 'Spesialkompetanse',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      };
    case 'special_tools':
      return { 
        icon: Wrench, 
        title: 'Spesialverktøy',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      };
    default:
      // Fallback for undefined or null resource types
      return { 
        icon: Users, 
        title: 'Tilgjengelig Bemanning',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
  }
};

export const ResourceTable: React.FC<ResourceTableProps> = ({ 
  title, 
  resources, 
  onMessageSent,
  onResourceClick,
  showStatus = false,
  showActions = false,
  showCompactView = false
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

  const loadUserCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserCompanyId(data.id);
    } catch (error) {
      console.error('Error loading user company:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusInfo = (resource: Resource) => {
    if (resource.is_taken) {
      return {
        icon: <Check className="w-4 h-4 text-green-600" />,
        text: 'Akseptert',
        color: 'text-green-600'
      };
    }
    
    const today = new Date();
    if (resource.period.to < today) {
      return {
        icon: <X className="w-4 h-4 text-gray-400" />,
        text: 'Utløpt',
        color: 'text-gray-400'
      };
    }

    return {
      icon: <Clock className="w-4 h-4 text-blue-600" />,
      text: 'Aktiv',
      color: 'text-blue-600'
    };
  };

  if (resources.length === 0) {
    return (
      <div className="bg-white border-2 border-elfag-dark rounded shadow-modern">
        <div className="p-4 border-b border-elfag-dark">
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p>Ingen ressurser tilgjengelig for øyeblikket.</p>
        </div>
      </div>
    );
  }

  if (showCompactView) {
    return (
      <div className="bg-white border-2 border-elfag-dark rounded shadow-modern">
        <div className="p-4 border-b border-elfag-dark">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{resources.length} ressurser tilgjengelig</p>
        </div>
        <div className="p-4">
          <div className="grid gap-3">
            {resources.slice(0, 5).map((resource) => {
              const typeInfo = getResourceTypeInfo(resource.resourceType);
              const Icon = typeInfo.icon;
              const isOwnResource = userCompanyId === resource.company_id;
              
              return (
                <div
                  key={resource.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer group ${
                    isOwnResource ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-elfag-light'
                  }`}
                  onClick={() => onResourceClick?.(resource)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded ${typeInfo.bgColor}`}>
                        <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{resource.competence}</h3>
                          {resource.is_taken && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                              Ikke tilgjengelig
                            </span>
                          )}
                          {isOwnResource && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              Egen annonse
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Fra: <span className="font-mono">{resource.anonymId}</span>
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {resource.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(resource.period.from)} - {formatDate(resource.period.to)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {resources.length > 5 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Og {resources.length - 5} flere ressurser...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full detailed view
  return (
    <div className="bg-white border-2 border-elfag-dark rounded shadow-modern">
      <div className="p-4 border-b border-elfag-dark">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{resources.length} ressurser</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-elfag-bg border-b">
              <th className="text-left p-4 font-medium">Type</th>
              <th className="text-left p-4 font-medium">Kompetanse/Beskrivelse</th>
              <th className="text-left p-4 font-medium">Bedrift</th>
              <th className="text-left p-4 font-medium">Periode</th>
              <th className="text-left p-4 font-medium">Lokasjon</th>
              {showStatus && <th className="text-left p-4 font-medium">Status</th>}
              <th className="text-left p-4 font-medium">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => {
              const typeInfo = getResourceTypeInfo(resource.resourceType);
              const Icon = typeInfo.icon;
              const isOwnResource = userCompanyId === resource.company_id;
              const status = getStatusInfo(resource);

              return (
                <tr 
                  key={resource.id} 
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    isOwnResource ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${typeInfo.bgColor} ${typeInfo.color}`}>
                      <Icon className="w-3 h-3" />
                      <span className="font-medium">{typeInfo.title}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{resource.competence}</div>
                    {resource.specialCompetencies && resource.specialCompetencies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {resource.specialCompetencies.slice(0, 2).map((competency, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {competency}
                          </span>
                        ))}
                        {resource.specialCompetencies.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{resource.specialCompetencies.length - 2} mer
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-sm text-elfag-dark">
                      {resource.anonymId}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div>{formatDate(resource.period.from)}</div>
                      <div className="text-gray-500">til {formatDate(resource.period.to)}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {resource.location}
                    </div>
                  </td>
                  {showStatus && (
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${status.color}`}>
                        {status.icon}
                        <span className="text-sm font-medium">{status.text}</span>
                      </div>
                    </td>
                  )}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onResourceClick?.(resource)}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-elfag-dark hover:text-elfag-light border border-elfag-dark hover:border-elfag-light rounded transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Detaljer
                      </button>
                      {!isOwnResource && user && (
                        <ContactButton 
                          resource={resource}
                          onMessageSent={onMessageSent}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};