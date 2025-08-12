import React, { useState, useEffect } from 'react';
import { ResourceTable } from './ResourceTable';
import { AddResourceForm } from './AddResourceForm';
import { Inbox } from './Inbox';
import { RegisterCompany } from './RegisterCompany';
import { UserProfile } from './UserProfile';
import { ResourceDetail } from './ResourceDetail';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2 } from 'lucide-react';
import type { Resource } from '../types';

type Tab = 'marketplace' | 'my-offers' | 'my-requests' | 'messages' | 'profile';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const [resources, setResources] = useState<Resource[]>([]);
  const [myOffers, setMyOffers] = useState<Resource[]>([]);
  const [myRequests, setMyRequests] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompany, setHasCompany] = useState(true);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Set up real-time subscription for resources
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('resources_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resources'
        },
        () => {
          loadAllResources();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, userCompanyId]);

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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        setHasCompany(false);
        setLoading(false);
        return;
      }

      setUserCompanyId(data.id);
      setHasCompany(true);
      await loadAllResources();
    } catch (error) {
      console.error('Error loading user company:', error);
      setError('Kunne ikke laste bedriftsinformasjon');
      setLoading(false);
    }
  };

  const loadAllResources = async () => {
    if (!userCompanyId) return;
    
    try {
      setLoading(true);
      const currentDate = new Date().toISOString();
      
      // Load marketplace resources - use simple query without join
      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from('resources')
        .select('*')
        .gte('period_to', currentDate)
        .eq('is_taken', false)
        .order('created_at', { ascending: false });

      if (marketplaceError) throw marketplaceError;

      // Load my offers
      const { data: myOffersData, error: myOffersError } = await supabase
        .from('resources')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false });

      if (myOffersError) throw myOffersError;

      // Load my requests
      const { data: myRequestsData, error: myRequestsError } = await supabase
        .from('resources')
        .select('*')
        .eq('accepted_by_company_id', userCompanyId)
        .order('created_at', { ascending: false });

      if (myRequestsError) throw myRequestsError;

      // Get all unique company IDs
      const allResources = [...(marketplaceData || []), ...(myOffersData || []), ...(myRequestsData || [])];
      const companyIds = [...new Set(allResources.map(r => r.company_id))];

      // Load company data separately
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, anonymous_id')
        .in('id', companyIds);

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
      }

      // Create a company lookup map
      const companyMap = (companiesData || []).reduce((map, company) => {
        map[company.id] = company.anonymous_id;
        return map;
      }, {} as Record<string, string>);

      // Transform resources with company data
      const transformWithCompanyData = (resources: any[]) => {
        return resources.map(item => ({
          id: item.id,
          company_id: item.company_id,
          anonymId: companyMap[item.company_id] || `company_${item.company_id.slice(-6)}`,
          competence: item.competence,
          period: {
            from: new Date(item.period_from),
            to: new Date(item.period_to)
          },
          location: item.location,
          comments: item.comments || '',
          contactInfo: item.contact_info,
          // Handle both old and new schema
          resourceType: item.resource_type || (item.is_special ? 'special_competence' : 'available_staffing'),
          specialCompetencies: item.special_competencies || [],
          is_taken: item.is_taken,
          acceptedByCompanyId: item.accepted_by_company_id
        }));
      };

      setResources(transformWithCompanyData(marketplaceData || []));
      setMyOffers(transformWithCompanyData(myOffersData || []));
      setMyRequests(transformWithCompanyData(myRequestsData || []));
      
      // Debug logging
      console.log('Dashboard Data Debug:');
      console.log('Raw marketplace data:', marketplaceData?.length || 0, 'items');
      console.log('Raw my offers data:', myOffersData?.length || 0, 'items');
      console.log('Raw my requests data:', myRequestsData?.length || 0, 'items');
      console.log('Company map:', companyMap);
      console.log('Transformed resources:', transformWithCompanyData(marketplaceData || []).length);
      console.log('Sample resource:', transformWithCompanyData(marketplaceData || [])[0]);
      
      setError(null);
    } catch (error) {
      console.error('Error loading resources:', error);
      setError('Kunne ikke laste ressurser. Vennligst prøv igjen senere.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async (newResource: Omit<Resource, 'id' | 'company_id'>) => {
    if (!user || !userCompanyId) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('resources')
        .insert({
          company_id: userCompanyId,
          competence: newResource.competence,
          period_from: newResource.period.from.toISOString(),
          period_to: newResource.period.to.toISOString(),
          location: newResource.location,
          comments: newResource.comments,
          contact_info: newResource.contactInfo,
          resource_type: newResource.resourceType,
          special_competencies: newResource.specialCompetencies || [],
          is_taken: false
        });

      if (error) throw error;
      await loadAllResources();
    } catch (error) {
      console.error('Error adding resource:', error);
      setError('Kunne ikke legge til ressurs. Vennligst prøv igjen senere.');
    }
  };

  const handleCompanyRegistered = () => {
    setHasCompany(true);
    setError(null);
    loadUserCompany();
  };

  const handleMessageSent = () => {
    loadAllResources();
  };

  const handleResourceClick = (resource: Resource) => {
    setSelectedResource(resource);
  };

  const handleBackToList = () => {
    setSelectedResource(null);
  };

  const getResourcesByType = (resources: Resource[], type: Resource['resourceType']) => {
    const filtered = resources.filter(r => r.resourceType === type);
    console.log(`Filtering resources by type ${type}:`, {
      total: resources.length,
      filtered: filtered.length,
      sampleTypes: resources.slice(0, 3).map(r => ({ id: r.id, type: r.resourceType, competence: r.competence }))
    });
    return filtered;
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elfag-dark mx-auto"></div>
          <p className="mt-4 text-gray-600">Laster...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-400 text-red-700 px-6 py-4 rounded">
          {error}
        </div>
      );
    }

    if (selectedResource) {
      return (
        <ResourceDetail
          resource={selectedResource}
          onBack={handleBackToList}
          onMessageSent={handleMessageSent}
          userCompanyId={userCompanyId}
        />
      );
    }

    switch (activeTab) {
      case 'marketplace':
        return (
          <div className="space-y-8">
            <ResourceTable 
              title="TILGJENGELIG BEMANNING" 
              resources={getResourcesByType(resources, 'available_staffing')}
              onMessageSent={handleMessageSent}
              onResourceClick={handleResourceClick}
              showCompactView
            />
            <ResourceTable 
              title="ØNSKER BEMANNING" 
              resources={getResourcesByType(resources, 'want_staffing')}
              onMessageSent={handleMessageSent}
              onResourceClick={handleResourceClick}
              showCompactView
            />
            <ResourceTable 
              title="SPESIALKOMPETANSE TIL UTLÅN" 
              resources={getResourcesByType(resources, 'special_competence')}
              onMessageSent={handleMessageSent}
              onResourceClick={handleResourceClick}
              showCompactView
            />
            <ResourceTable 
              title="SPESIALVERKTØY" 
              resources={getResourcesByType(resources, 'special_tools')}
              onMessageSent={handleMessageSent}
              onResourceClick={handleResourceClick}
              showCompactView
            />
          </div>
        );
      case 'my-offers':
        return (
          <ResourceTable 
            title="MINE ANNONSER" 
            resources={myOffers}
            onMessageSent={handleMessageSent}
            onResourceClick={handleResourceClick}
            showStatus
            showActions
          />
        );
      case 'my-requests':
        return (
          <ResourceTable 
            title="MINE FORESPØRSLER" 
            resources={myRequests}
            onMessageSent={handleMessageSent}
            onResourceClick={handleResourceClick}
            showStatus
            showActions
          />
        );
      case 'messages':
        return <Inbox onMessageUpdate={loadAllResources} />;
      case 'profile':
        return <UserProfile />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded border-2 border-elfag-dark shadow-modern">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-elfag-bg">
            <Building2 className="w-8 h-8 text-elfag-dark" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Elfag Ressursdeling</h1>
            <p className="text-gray-700 mb-4">
              Plattform for deling av arbeidskraft og spesialkompetanse mellom Elfag-bedrifter.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-elfag-bg p-3 rounded">
                <h3 className="font-semibold mb-1">🔒 Anonymt system</h3>
                <p className="text-gray-600">All kommunikasjon er anonym til du aksepterer tilbud</p>
              </div>
              <div className="bg-elfag-bg p-3 rounded">
                <h3 className="font-semibold mb-1">⚡ Sanntidsoppdateringer</h3>
                <p className="text-gray-600">Se nye tilbud og forespørsler umiddelbart</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!hasCompany ? (
        <RegisterCompany onRegistered={handleCompanyRegistered} />
      ) : (
        <>
          <AddResourceForm onAdd={handleAddResource} />

          <div className="bg-white rounded border-2 border-elfag-dark shadow-modern">
            <div className="border-b border-elfag-dark">
              <nav className="flex flex-wrap">
                {[
                  { id: 'marketplace', label: 'Markedsplass' },
                  { id: 'my-offers', label: 'Mine annonser' },
                  { id: 'my-requests', label: 'Mine forespørsler' },
                  { id: 'messages', label: 'Meldinger' },
                  { id: 'profile', label: 'Min side' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-elfag-dark bg-elfag-bg text-elfag-dark'
                        : 'border-transparent text-gray-500 hover:text-elfag-dark hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};