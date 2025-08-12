import React, { useState } from 'react';
import { PlusCircle, X, Users, User, Clock, Wrench } from 'lucide-react';
import type { Resource } from '../types';

interface AddResourceFormProps {
  onAdd: (resource: Omit<Resource, 'id' | 'company_id'>) => void;
}

const SPECIAL_COMPETENCIES = [
  'PLS/SCADA programmering',
  'Høyspenning',
  'Fibermontasje',
  'Kabelmontasje',
  'Instrumentering',
  'Automasjon',
  'Kalibrering',
  'El-tavlemontasje',
  'Motorstyring',
  'Frekvensomformer',
  'Sikkerhetssystemer',
  'Brann og sikring',
  'Telekommunikasjon',
  'Varmekabler',
  'Jordingssystemer'
];

const RESOURCE_TYPES = [
  {
    id: 'available_staffing' as const,
    title: 'Tilgjengelig Bemanning',
    description: 'Vi har ledig arbeidskraft å tilby',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'want_staffing' as const,
    title: 'Ønsker Bemanning',
    description: 'Vi trenger ekstra arbeidskraft',
    icon: User,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'special_competence' as const,
    title: 'Spesialkompetanse',
    description: 'Vi kan låne ut spesialist-kunnskap',
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'special_tools' as const,
    title: 'Spesialverktøy',
    description: 'Vi har spesialverktøy tilgjengelig',
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
];

export const AddResourceForm: React.FC<AddResourceFormProps> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<Resource['resourceType'] | null>(null);
  const [formData, setFormData] = useState({
    anonymId: '',
    competence: '',
    period: {
      from: '',
      to: ''
    },
    location: '',
    comments: '',
    contactInfo: '',
    specialCompetencies: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    onAdd({
      ...formData,
      resourceType: selectedType,
      period: {
        from: new Date(formData.period.from),
        to: new Date(formData.period.to)
      },
      specialCompetencies: selectedType === 'special_competence' ? formData.specialCompetencies : undefined
    });
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      anonymId: '',
      competence: '',
      period: { from: '', to: '' },
      location: '',
      comments: '',
      contactInfo: '',
      specialCompetencies: []
    });
    setSelectedType(null);
    setIsOpen(false);
  };

  const toggleSpecialCompetency = (competency: string) => {
    setFormData(prev => ({
      ...prev,
      specialCompetencies: prev.specialCompetencies.includes(competency)
        ? prev.specialCompetencies.filter(c => c !== competency)
        : [...prev.specialCompetencies, competency]
    }));
  };

  const selectedTypeInfo = selectedType ? RESOURCE_TYPES.find(t => t.id === selectedType) : null;

  return (
    <div className="mb-6">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-elfag-dark text-white px-6 py-3 rounded hover:bg-elfag-light transition-colors shadow-modern"
        >
          <PlusCircle className="w-5 h-5" />
          Registrer ny ressurs
        </button>
      ) : (
        <div className="bg-white p-6 rounded border-2 border-elfag-dark shadow-modern">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Registrer ny ressurs</h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!selectedType ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Velg type ressurs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RESOURCE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-6 border-2 ${type.borderColor} ${type.bgColor} rounded-lg hover:shadow-md transition-all text-left group`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-white shadow-sm`}>
                          <Icon className={`w-6 h-6 ${type.color}`} />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${type.color} mb-1`}>{type.title}</h4>
                          <p className="text-gray-600 text-sm">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={`p-4 rounded-lg ${selectedTypeInfo?.bgColor} border ${selectedTypeInfo?.borderColor}`}>
                <div className="flex items-center gap-3">
                  {selectedTypeInfo && (
                    <>
                      <selectedTypeInfo.icon className={`w-6 h-6 ${selectedTypeInfo.color}`} />
                      <div>
                        <h3 className={`font-semibold ${selectedTypeInfo.color}`}>{selectedTypeInfo.title}</h3>
                        <p className="text-sm text-gray-600">{selectedTypeInfo.description}</p>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedType(null)}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Endre type
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anonym bedriftsnavn
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.anonymId}
                    onChange={(e) => setFormData({ ...formData, anonymId: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                    placeholder="F.eks. Bedrift A"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedType === 'special_tools' ? 'Verktøy/Utstyr' : 'Kompetanse/Beskrivelse'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.competence}
                    onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                    placeholder={selectedType === 'special_tools' ? 'F.eks. Kabeltrekker, Måleutstyr' : 'F.eks. Montør, Elektriker'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fra dato
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.period.from}
                    onChange={(e) => setFormData({ ...formData, period: { ...formData.period, from: e.target.value } })}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Til dato
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.period.to}
                    onChange={(e) => setFormData({ ...formData, period: { ...formData.period, to: e.target.value } })}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lokasjon
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                  placeholder="F.eks. Oslo, Trondheim, eller Nasjonalt"
                />
              </div>

              {selectedType === 'special_competence' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Velg spesialkompetanser (valgfritt)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded p-4">
                    {SPECIAL_COMPETENCIES.map((competency) => (
                      <label key={competency} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.specialCompetencies.includes(competency)}
                          onChange={() => toggleSpecialCompetency(competency)}
                          className="w-4 h-4 text-elfag-dark focus:ring-elfag-light border-gray-300 rounded"
                        />
                        <span className="text-sm">{competency}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kommentarer (valgfritt)
                </label>
                <textarea
                  rows={3}
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                  placeholder="Ytterligere informasjon..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kontaktinformasjon (synlig for alle)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.contactInfo}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-elfag-light focus:border-transparent"
                  placeholder="Kontaktperson, telefon, e-post..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-elfag-dark text-white py-3 px-6 rounded hover:bg-elfag-light transition-colors font-medium"
                >
                  Publiser ressurs
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};