import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, MessageSquare, Clock, User, Wrench, Users } from 'lucide-react';
import { ContactButton } from './ContactButton';
import { Resource } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ResourceDetailProps {
  resource: Resource;
  onBack: () => void;
  onMessageSent?: () => void;
  userCompanyId?: string | null;
}

const getResourceTypeInfo = (resourceType: Resource['resourceType']) => {
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
        title: 'Spesialkompetanse til Utlån',
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
  }
};

export const ResourceDetail: React.FC<ResourceDetailProps> = ({ 
  resource, 
  onBack, 
  onMessageSent,
  userCompanyId
}) => {
  const { user } = useAuth();
  const resourceTypeInfo = getResourceTypeInfo(resource.resourceType);
  const Icon = resourceTypeInfo.icon;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isOwnResource = userCompanyId === resource.company_id;

  return (
    <div className="bg-white rounded border-2 border-elfag-dark shadow-modern">
      <div className="p-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-elfag-dark hover:text-elfag-light mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Tilbake til oversikt
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${resourceTypeInfo.bgColor}`}>
            <Icon className={`w-8 h-8 ${resourceTypeInfo.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${resourceTypeInfo.bgColor} ${resourceTypeInfo.color}`}>
                {resourceTypeInfo.title}
              </span>
              {resource.is_taken && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-50 text-red-600">
                  Ikke tilgjengelig
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">{resource.competence}</h1>
            <p className="text-gray-600">Fra: <span className="font-mono text-elfag-dark">{resource.anonymId}</span></p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-elfag-dark" />
                Tidsperiode
              </h3>
              <div className="bg-elfag-bg p-4 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Fra</p>
                    <p className="font-semibold">{formatDate(resource.period.from)}</p>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div>
                    <p className="text-sm text-gray-600">Til</p>
                    <p className="font-semibold">{formatDate(resource.period.to)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-elfag-dark" />
                Lokasjon
              </h3>
              <div className="bg-elfag-bg p-4 rounded">
                <p className="font-semibold">{resource.location}</p>
              </div>
            </div>

            {resource.specialCompetencies && resource.specialCompetencies.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Spesialkompetanser</h3>
                <div className="bg-elfag-bg p-4 rounded">
                  <div className="flex flex-wrap gap-2">
                    {resource.specialCompetencies.map((competency, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-elfag-dark text-white text-sm rounded-full"
                      >
                        {competency}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {resource.comments && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Kommentarer</h3>
                <div className="bg-elfag-bg p-4 rounded">
                  <p className="whitespace-pre-wrap">{resource.comments}</p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3">Kontaktinformasjon</h3>
              <div className="bg-elfag-bg p-4 rounded">
                <p className="whitespace-pre-wrap">{resource.contactInfo}</p>
              </div>
            </div>

            {!isOwnResource && user && (
              <div className="pt-4">
                <ContactButton 
                  resource={resource}
                  onMessageSent={onMessageSent}
                />
              </div>
            )}

            {isOwnResource && (
              <div className="pt-4 p-4 bg-blue-50 rounded border-2 border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>Dette er din egen annonse.</strong> Du kan ikke sende melding til deg selv.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 