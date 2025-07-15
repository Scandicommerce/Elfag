import React, { useEffect, useState } from 'react';
import { Mail, Send, Loader, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import emailjs from 'emailjs-com';
import type { Message } from '../types';

interface InboxProps {
  onMessageUpdate?: () => void;
}

export const Inbox: React.FC<InboxProps> = ({ onMessageUpdate }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedThread, setSelectedThread] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasCompany, setHasCompany] = useState(true);
  const [contactShared, setContactShared] = useState<Record<string, boolean>>({});
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadUserCompany();
  }, [user]);

  useEffect(() => {
    if (!userCompanyId) return;

    // Subscribe to messages - both sent and received
    const messagesChannel = supabase.channel('messages_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `from_company_id=eq.${userCompanyId}`,
      }, () => {
        loadMessages();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `to_company_id=eq.${userCompanyId}`,
      }, () => {
        loadMessages();
      })
      .subscribe();

    // Subscribe to contact sharing
    const sharingChannel = supabase.channel('contact_sharing_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'thread_contact_sharing',
        filter: `from_company_id=eq.${userCompanyId}`,
      }, () => {
        loadContactSharing();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'thread_contact_sharing',
        filter: `to_company_id=eq.${userCompanyId}`,
      }, () => {
        loadContactSharing();
      })
      .subscribe();

    // Initial data load
    loadMessages();
    loadContactSharing();

    return () => {
      messagesChannel.unsubscribe();
      sharingChannel.unsubscribe();
    };
  }, [userCompanyId]);

  // When selected message changes, load its thread
  useEffect(() => {
    if (selectedMessage) {
      loadThread(selectedMessage.thread_id || selectedMessage.id);
    }
  }, [selectedMessage]);

  const loadUserCompany = async () => {
    if (!user) return;

    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!company) {
        setHasCompany(false);
        setUserCompanyId(null);
        return;
      }

      setUserCompanyId(company.id);
      setHasCompany(true);
    } catch (error) {
      console.error('Error loading user company:', error);
      setError('Kunne ikke laste bedriftsinformasjon. Vennligst prøv igjen senere.');
    }
  };

  const loadContactSharing = async () => {
    if (!userCompanyId) return;

    try {
      const { data: sharingData, error: sharingError } = await supabase
        .from('thread_contact_sharing')
        .select('thread_id, from_company_id, to_company_id')
        .or(`from_company_id.eq.${userCompanyId},to_company_id.eq.${userCompanyId}`);

      if (sharingError) throw sharingError;

      const sharedThreads = sharingData.reduce((acc: Record<string, boolean>, curr) => {
        acc[curr.thread_id] = true;
        return acc;
      }, {});

      setContactShared(sharedThreads);
    } catch (error) {
      console.error('Error loading contact sharing:', error);
    }
  };

  const loadMessages = async () => {
    if (!userCompanyId) return;

    try {
      setLoading(true);
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          subject,
          content,
          created_at,
          read_at,
          thread_id,
          from_company:from_company_id(
            id, 
            anonymous_id,
            real_contact_info
          ),
          to_company:to_company_id( 
            id, 
            anonymous_id,
            real_contact_info
          ),
          resource:resource_id(
            id, 
            competence,
            is_taken,
            price,
            price_type
          )
        `)
        // Only show messages where current user is the RECEIVER (to_company_id)
        // This prevents offer providers from seeing their own suggestions
        .eq('to_company_id', userCompanyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert array relationships to single objects and filter valid messages
      const validMessages = (messages || [])
        .map(msg => {
          // Handle potential array responses for relationships
          const fromCompany = Array.isArray(msg.from_company) 
            ? msg.from_company[0] 
            : msg.from_company;
          const toCompany = Array.isArray(msg.to_company) 
            ? msg.to_company[0] 
            : msg.to_company;
          const resource = Array.isArray(msg.resource) 
            ? msg.resource[0] 
            : msg.resource;
          
          return {
            ...msg,
            from_company: fromCompany,
            to_company: toCompany,
            resource: resource
          };
        })
        .filter(msg => {
          const isValid = msg.from_company && msg.to_company && msg.resource;
          return isValid;
        });

      // If no valid messages, let's try a simpler query approach
      if (validMessages.length === 0 && (messages || []).length > 0) {
        const fallbackMessages = (messages || []).map(msg => ({
          ...msg,
          from_company: (Array.isArray(msg.from_company) ? msg.from_company[0] : msg.from_company) || { id: 'unknown', anonymous_id: 'Unknown' },
          to_company: (Array.isArray(msg.to_company) ? msg.to_company[0] : msg.to_company) || { id: 'unknown', anonymous_id: 'Unknown' },
          resource: (Array.isArray(msg.resource) ? msg.resource[0] : msg.resource) || { id: 'unknown', competence: 'Unknown' }
        }));
        
        setMessages(fallbackMessages as unknown as Message[]);
        return;
      }

      // Group messages by thread and get the latest message from each thread
      const threadMap = new Map();
      validMessages.forEach(msg => {
        const threadId = msg.thread_id || msg.id;
        if (!threadMap.has(threadId) || new Date(msg.created_at) > new Date(threadMap.get(threadId).created_at)) {
          threadMap.set(threadId, msg);
        }
      });

      const latestMessages = Array.from(threadMap.values());
      
      setMessages(latestMessages as Message[]);

      // If there's a selected message, ensure it stays selected after refresh
      if (selectedMessage) {
        const updatedSelectedMessage = latestMessages.find(
          msg => msg.id === selectedMessage.id || msg.thread_id === selectedMessage.id
        );

        if (updatedSelectedMessage) {
          setSelectedMessage(updatedSelectedMessage);
        }
      }

      // Notify parent component if needed
      if (onMessageUpdate) {
        onMessageUpdate();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Kunne ikke laste meldinger. Vennligst prøv igjen senere.');
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (messageId: string) => {
    try {
      setLoadingThread(true);
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          subject,
          content,
          created_at,
          read_at,
          thread_id,
          from_company:from_company_id(
            id, 
            anonymous_id,
            real_contact_info
          ),
          to_company:to_company_id(
            id, 
            anonymous_id,
            real_contact_info
          ),
          resource:resource_id(
            id, 
            competence,
            is_taken,
            price,
            price_type
          )
        `)
        .or(`id.eq.${messageId},thread_id.eq.${messageId}`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Convert array relationships to single objects and filter valid messages
      const validMessages = messages
        .map(msg => {
          // Handle potential array responses for relationships
          const fromCompany = Array.isArray(msg.from_company) 
            ? msg.from_company[0] 
            : msg.from_company;
          const toCompany = Array.isArray(msg.to_company) 
            ? msg.to_company[0] 
            : msg.to_company;
          const resource = Array.isArray(msg.resource) 
            ? msg.resource[0] 
            : msg.resource;
          
          return {
            ...msg,
            from_company: fromCompany,
            to_company: toCompany,
            resource: resource
          };
        })
        .filter(msg => msg.from_company && msg.to_company && msg.resource);

      setSelectedThread(validMessages as Message[]);

      // Mark unread messages as read
      const unreadMessages = validMessages.filter(msg => 
        !msg.read_at && 
        msg.to_company.id === userCompanyId
      );

      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(msg =>
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', msg.id)
          )
        );
      }
    } catch (error) {
      console.error('Error loading thread:', error);
      setError('Kunne ikke laste meldingstråd. Vennligst prøv igjen senere.');
    } finally {
      setLoadingThread(false);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !reply.trim() || !userCompanyId) return;

    try {
      const threadId = selectedMessage.thread_id || selectedMessage.id;
      const toCompanyId = selectedMessage.from_company.id === userCompanyId
        ? selectedMessage.to_company.id
        : selectedMessage.from_company.id;

      const { error } = await supabase
        .from('messages')
        .insert({
          from_company_id: userCompanyId,
          to_company_id: toCompanyId,
          resource_id: selectedMessage.resource.id,
          subject: `Re: ${selectedMessage.subject}`,
          content: reply,
          thread_id: threadId
        });

      if (error) throw error;

      setReply('');
      loadMessages();
      loadThread(threadId);
      
      if (onMessageUpdate) {
        onMessageUpdate();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Kunne ikke sende svar. Vennligst prøv igjen senere.');
    }
  };


  const handleAwardOffer = async (messageId: string) => {
    if (!selectedMessage || !userCompanyId) return;

    try {
      // Update the read_at field to mark message as read
      const { error: updateError } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', selectedMessage.id)

      if (updateError) {
        console.error("❌ UPDATE failed:", updateError);
        setError(`Failed to update message: ${updateError.message}`);
        return;
      }
      
      console.log("✅ Message marked as read successfully");

      // Continue with the rest of the acceptance logic
      const { data: resourceData, error: resourceError } = await supabase
        .from('resources')
        .select('contact_info')
        .eq('id', selectedMessage.resource.id)
        .single();

      if (resourceError) throw resourceError;

      if (!resourceData?.contact_info) {
        setError('Kontaktinformasjon ikke funnet for denne ressursen.');
        return;
      }
      
      // Update the local state to reflect the change
      setSelectedMessage({
        ...selectedMessage,
        read_at: new Date().toISOString()
      });
      
      await loadMessages();
      await loadThread(messageId);
      
      if (onMessageUpdate) {
        onMessageUpdate();
      }
      setSuccessMessage('Tilbud akseptert og kontaktinfo sendt');
      
      // Send acceptance email immediately
      await sendEmail(resourceData.contact_info, userCompanyId);
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error accepting proposal:', error);
      setError('Kunne ikke akseptere tilbud. Prøv igjen senere.');
    }
  };

  const sendEmail = async (contactInfo: any, userCompanyId: string) => {    
    try {
      if (!selectedMessage) {
        console.error('No selected message available');
        return;
      }

      // Get the user's company info for the email
      const { data: userCompany, error: companyError } = await supabase
        .from('companies')
        .select('real_contact_info')
        .eq('id', userCompanyId)
        .single();

      if (companyError || !userCompany?.real_contact_info) {
        console.error('Failed to get user company info:', companyError);
        throw new Error('Could not get company information');
      }

      // Get the offeror's email from the message
      const offerorEmail = selectedMessage.from_company.real_contact_info?.email;
      const offerorCompanyName = selectedMessage.from_company.real_contact_info?.company_name;

      if (!offerorEmail) {
        console.error('No offeror email available');
        throw new Error('Could not get offeror email address');
      }

      const emailSubject = `Tilbud Akseptert - ${selectedMessage.subject}`;
      const emailHtml = `
        <h2>Hei ${offerorCompanyName || 'Tilbudsgiver'}!</h2>
        
        <p>Ditt tilbud har blitt akseptert for prosjektet: <strong>${selectedMessage.subject}</strong></p>
        
        <h3>Prosjektdetaljer:</h3>
        <ul>
          <li><strong>Kompetanse:</strong> ${selectedMessage.resource.competence}</li>
          <li><strong>Oppdragsgiver:</strong> ${userCompany.real_contact_info.company_name}</li>
        </ul>
        
        <h3>Kontaktinformasjon for oppdragsgiver:</h3>
        <ul>
          <li><strong>Bedrift:</strong> ${userCompany.real_contact_info.company_name}</li>
          <li><strong>E-post:</strong> ${userCompany.real_contact_info.email}</li>
          <li><strong>Telefon:</strong> ${userCompany.real_contact_info.phone}</li>
          <li><strong>Adresse:</strong> ${userCompany.real_contact_info.address}</li>
        </ul>
        
        <p>Du kan nå kontakte oppdragsgiver direkte for å diskutere videre detaljer.</p>
        
        <p><strong>Vennlig hilsen,<br>Elfag Ressursdeling</strong></p>
      `;

      const sendingRes = await emailjs.send(
        'service_7nh9cjs',
        'template_6jjiksl',
        {
          name: emailSubject,
          message: emailHtml,
          to_email: offerorEmail,
          from_name: "Elfag Ressursdeling",
        },
        'PBojUtgTaeYCAp_4n'
      )

      console.log("sendingRes=====>", sendingRes)
      setSuccessMessage('E-post sendt til tilbudsgiver!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error sending acceptance email:', error);
      setError('Kunne ikke sende e-post. Prøv igjen senere.');
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  }

  const handleMarkAsTaken = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('resources')
        .update({ is_taken: true })
        .eq('id', resourceId);

      if (error) throw error;

      // Refresh messages to update UI
      loadMessages();
      if (onMessageUpdate) {
        onMessageUpdate();
      }
    } catch (error) {
      console.error('Error marking resource as taken:', error);
      setError('Kunne ikke markere ressursen som tatt. Prøv igjen senere.');
    }
  };

  const getDisplayName = (message: Message, isFromUser: boolean) => {
    const company = isFromUser ? message.from_company : message.to_company;
    const isShared = contactShared[message.thread_id || message.id];
    
    if (isFromUser) return 'Du';
    if (isShared && company.real_contact_info) {
      return company.real_contact_info.company_name;
    }
    return company.anonymous_id;
  };

  if (!hasCompany) {
    return (
      <div className="bg-white border-2 border-elfag-dark rounded shadow-industrial p-4">
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Du må registrere en bedrift før du kan bruke meldingsfunksjonen.
          Vennligst kontakt support for assistanse.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-elfag-dark rounded shadow-industrial">
      <div className="bg-elfag-light p-3">
        <h2 className="text-xl font-bold text-elfag-dark flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Meldinger
        </h2>
      </div>

      {error && (
        <div className="p-4">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4">
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
        {/* Message List */}
        <div className="border-r border-gray-200 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="w-6 h-6 animate-spin text-elfag-dark" />
              <span className="ml-2">Laster meldinger...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Ingen meldinger</div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => {
                const isUnread = !message.read_at && message.to_company.id === userCompanyId;
                const isSelected = selectedMessage?.id === message.id || 
                                 selectedMessage?.thread_id === message.id ||
                                 message.thread_id === selectedMessage?.id;
                const displayName = getDisplayName(
                  message,
                  message.from_company.id === userCompanyId
                );
                
                return (
                  <button
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`w-full p-4 text-left hover:bg-gray-50 ${
                      isSelected ? 'bg-gray-50' : ''
                    } ${isUnread ? 'font-semibold bg-elfag-light bg-opacity-10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm">
                        {message.from_company.id === userCompanyId
                          ? `Til: ${getDisplayName(message, false)}`
                          : `Fra: ${displayName}`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm truncate">{message.subject}</div>
                    {isUnread && (
                      <div className="mt-1">
                        <span className="inline-block px-2 py-1 text-xs bg-elfag-light bg-opacity-20 rounded-full">
                          Ny melding
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="col-span-2 flex flex-col h-full">
          {selectedMessage ? (
            <div className="flex flex-col h-full p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedMessage.subject}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {/* Only show these buttons/statuses to job poster (receiver) */}
                  {selectedMessage.to_company.id === userCompanyId && (
                    <>
                      {!selectedMessage.read_at && (
                        <button
                          onClick={() => handleAwardOffer(selectedMessage.thread_id || selectedMessage.id)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded"
                        >
                          <Mail className="w-4 h-4" />
                          Accept
                        </button>
                      )}
                      {selectedMessage.read_at && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Check className="w-4 h-4" />
                          Accepted
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Main Message Content - Display the selected message prominently */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-gray-700">
                    Fra: {getDisplayName(selectedMessage, selectedMessage.from_company.id === userCompanyId)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {selectedMessage.content}
                </div>
                {/* Show resource details */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <strong>Kompetanse:</strong> {selectedMessage.resource.competence}
                    {selectedMessage.resource.price && (
                      <span className="ml-4">
                        <strong>Pris:</strong> {selectedMessage.resource.price} kr
                        {selectedMessage.resource.price_type && ` (${selectedMessage.resource.price_type})`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {loadingThread ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader className="w-6 h-6 animate-spin text-elfag-dark" />
                    <span className="ml-2">Laster meldingstråd...</span>
                  </div>
                ) : (
                  selectedThread.map((message) => {
                    const isFromUser = message.from_company.id === userCompanyId;
                    const isContactMessage = message.subject === 'Kontaktinformasjon delt';
                    
                    // Only show offer provider's contact info to job poster when awarded
                    const showContactInfo = message.from_company.real_contact_info &&
                                         !isContactMessage &&
                                         selectedMessage.to_company.id === userCompanyId && // Current user is job poster
                                         message.from_company.id === selectedMessage.from_company.id; // Show only offer provider's info
                    
                    return (
                      <div
                        key={message.id}
                        className={`p-4 rounded ${
                          isContactMessage
                            ? 'bg-green-50 text-center' 
                            : isFromUser
                              ? 'bg-elfag-light bg-opacity-10 ml-8'
                              : 'bg-gray-50 mr-8'
                        }`}
                      >
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                          <div>
                            <p className="font-medium">
                              {getDisplayName(message, isFromUser)}
                            </p>
                          </div>
                          <span>
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        {showContactInfo && (
                          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                            <p className="font-semibold">Kontaktinformasjon fra tilbudsgiver:</p>
                            <p>{message.from_company.real_contact_info?.company_name}</p>
                            <p>{message.from_company.real_contact_info?.email}</p>
                            <p>{message.from_company.real_contact_info?.phone}</p>
                            <p>{message.from_company.real_contact_info?.address}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Velg en melding for å lese
            </div>
          )}
        </div>
      </div>
    </div>
  );
};