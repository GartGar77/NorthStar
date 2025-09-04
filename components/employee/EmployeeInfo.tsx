import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { createChangeRequest, getChangeRequests, getCompanySettings } from '../../services/api';
import type { Employee, SuperAdmin, ChangeRequest, CompanyAddress, AllocatedBankDetails, PhoneNumber, EmailAddress, CompanySettings } from '../../types';
import { ChangeRequestType, ChangeRequestStatus, Province } from '../../types';
import { HomeIcon, PhoneIcon, EnvelopeIcon, LockIcon, BanknotesIcon } from '../icons/Icons';
import Avatar from '../ui/Avatar';

interface EmployeeInfoProps {
  session: { user: Employee | SuperAdmin; tenantId: string };
}

const StatusBadge: React.FC<{ status: ChangeRequestStatus }> = ({ status }) => {
  const styles = {
    [ChangeRequestStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [ChangeRequestStatus.Approved]: 'bg-green-100 text-green-800',
    [ChangeRequestStatus.Rejected]: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; onAction: () => void; children: React.ReactNode }> = ({ title, icon, onAction, children }) => (
    <Card className="shadow-sm">
        <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center bg-slate-100">
                    {icon}
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    <div className="text-sm text-slate-600 mt-1">{children}</div>
                </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onAction}>Request Change</Button>
        </div>
    </Card>
);

const EmployeeInfo: React.FC<EmployeeInfoProps> = ({ session }) => {
  const currentUser = session.user as Employee;
  const currentProfile = useMemo(() => currentUser.profileHistory[0].profile, [currentUser]);

  const [modalType, setModalType] = useState<ChangeRequestType | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  // Form State
  const [addressData, setAddressData] = useState<CompanyAddress>(currentProfile.address);
  const [sin, setSin] = useState('');
  const [bankAccounts, setBankAccounts] = useState<AllocatedBankDetails[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCompanySettings = useCallback(async () => {
    try {
        const settings = await getCompanySettings(session.tenantId);
        setCompanySettings(settings);
    } catch (e) {
        console.error("Could not load company settings for form types.");
    }
  }, [session.tenantId]);

  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getChangeRequests(session.tenantId, currentUser.id);
      setPendingRequests(data.filter(r => r.status === ChangeRequestStatus.Pending));
    } catch (e) {
      setError('Could not load your pending requests.');
    } finally {
      setIsLoading(false);
    }
  }, [session.tenantId, currentUser.id]);

  useEffect(() => {
    fetchPendingRequests();
    fetchCompanySettings();
  }, [fetchPendingRequests, fetchCompanySettings]);

  const phoneTypes = companySettings?.configurations?.phoneTypes || ['Cell', 'Home', 'Work'];
  const emailTypes = companySettings?.configurations?.emailTypes || ['Work', 'Personal'];

  const openModal = (type: ChangeRequestType) => {
    setError(null);
    if (type === ChangeRequestType.Address) setAddressData(currentProfile.address);
    if (type === ChangeRequestType.SIN) setSin('');
    if (type === ChangeRequestType.BankDetails) setBankAccounts(JSON.parse(JSON.stringify(currentUser.bankAccounts || [])));
    if (type === ChangeRequestType.PhoneNumber) setPhoneNumbers(JSON.parse(JSON.stringify(currentProfile.phoneNumbers || [])));
    if (type === ChangeRequestType.EmailAddress) setEmailAddresses(JSON.parse(JSON.stringify(currentProfile.emails || [])));
    if (type === ChangeRequestType.ProfilePhoto) setNewPhoto(null);
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };
  
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewPhoto(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async () => {
    if (!modalType) return;
    
    let oldValue: any, newValue: any;
    switch (modalType) {
        case ChangeRequestType.Address:
            oldValue = currentProfile.address;
            newValue = addressData;
            break;
        case ChangeRequestType.SIN:
            oldValue = currentUser.payroll.canada?.sin;
            newValue = sin;
            break;
        case ChangeRequestType.BankDetails:
            const totalAllocation = bankAccounts.reduce((sum, acc) => sum + Number(acc.allocationPercent || 0), 0);
            if (totalAllocation !== 100) {
                setError("Total bank account allocation must equal 100%.");
                return;
            }
            oldValue = currentUser.bankAccounts;
            newValue = bankAccounts;
            break;
        case ChangeRequestType.PhoneNumber:
            oldValue = currentProfile.phoneNumbers;
            newValue = phoneNumbers;
            break;
        case ChangeRequestType.EmailAddress:
            oldValue = currentProfile.emails;
            newValue = emailAddresses;
            break;
        case ChangeRequestType.ProfilePhoto:
            if (!newPhoto) {
                setError("Please select a new photo to upload.");
                return;
            }
            oldValue = currentProfile.avatarUrl || '';
            newValue = newPhoto;
            break;
    }

    try {
        await createChangeRequest(session.tenantId, {
            employeeId: currentUser.id,
            type: modalType,
            oldValue,
            newValue
        });
        closeModal();
        fetchPendingRequests();
    } catch (e: any) {
        setError(e.message || 'Failed to submit request.');
    }
  };

  const inputClass = "mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoCard title="Home Address" icon={<HomeIcon className="h-6 w-6 text-slate-500" />} onAction={() => openModal(ChangeRequestType.Address)}>
              <address className="not-italic">
                  {currentProfile.address.street} <br/>
                  {currentProfile.address.city}, {currentProfile.address.province} {currentProfile.address.postalCode}
              </address>
          </InfoCard>

           <InfoCard title="Phone Numbers" icon={<PhoneIcon className="h-6 w-6 text-slate-500" />} onAction={() => openModal(ChangeRequestType.PhoneNumber)}>
                {currentProfile.phoneNumbers?.length > 0 ? (
                    currentProfile.phoneNumbers.map((p,i) => <p key={i}><span className="font-medium">{p.type}:</span> {p.number}</p>)
                ) : (
                    <p className="italic text-slate-500">No phone numbers on file.</p>
                )}
          </InfoCard>

          <InfoCard title="Email Addresses" icon={<EnvelopeIcon className="h-6 w-6 text-slate-500" />} onAction={() => openModal(ChangeRequestType.EmailAddress)}>
               {currentProfile.emails?.length > 0 ? (
                    currentProfile.emails.map((e,i) => <p key={i}><span className="font-medium">{e.type}:</span> {e.address}</p>)
                ) : (
                     <p className="italic text-slate-500">No email addresses on file.</p>
                )}
          </InfoCard>

          <InfoCard title="Social Insurance Number" icon={<LockIcon className="h-6 w-6 text-slate-500" />} onAction={() => openModal(ChangeRequestType.SIN)}>
              <p className="font-mono tracking-wider">***-***-{currentUser.payroll.canada?.sin.slice(-3)}</p>
          </InfoCard>
          
           <InfoCard title="Profile Photo" icon={<Avatar name={currentProfile.name} src={currentProfile.avatarUrl} size="sm"/>} onAction={() => openModal(ChangeRequestType.ProfilePhoto)}>
            <p className="italic text-slate-500">
                {currentProfile.avatarUrl ? 'A profile photo is on file.' : 'No profile photo has been set.'}
            </p>
          </InfoCard>

          <div className="lg:col-span-2">
            <InfoCard title="Direct Deposit Information" icon={<BanknotesIcon className="h-6 w-6 text-slate-500" />} onAction={() => openModal(ChangeRequestType.BankDetails)}>
                <div className="space-y-2">
                    {currentUser.bankAccounts?.length > 0 ? (
                        currentUser.bankAccounts.map((acc, i) => (
                            <div key={acc.id || i}>
                                {acc.nickname && <strong>{acc.nickname} ({acc.allocationPercent}%): </strong>}
                                Institution: {acc.institution} | Transit: {acc.transit} | Account: ...{acc.account.slice(-4)}
                            </div>
                        ))
                    ) : (
                        <p className="italic text-slate-500">No bank details on file.</p>
                    )}
                </div>
            </InfoCard>
          </div>
      </div>


      <Card title="My Pending Requests">
        {isLoading && <p className="text-slate-500">Loading...</p>}
        {!isLoading && pendingRequests.length === 0 && <p className="text-slate-500 text-center py-4">You have no pending requests.</p>}
        {!isLoading && pendingRequests.length > 0 && (
            <div className="divide-y divide-slate-200 -mx-6">
                {pendingRequests.map(req => (
                    <div key={req.id} className="px-6 py-3 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-slate-800">{req.type}</p>
                            <p className="text-sm text-slate-500">Requested on {new Date(req.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <StatusBadge status={req.status} />
                    </div>
                ))}
            </div>
        )}
      </Card>
      
      {modalType && (
        <Modal
            isOpen={!!modalType}
            onClose={closeModal}
            title={`Request ${modalType} Change`}
            footer={<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button variant="primary" onClick={handleSubmitRequest}>Submit for Approval</Button></>}
        >
            <div className="space-y-4">
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</div>}
                <p className="text-sm text-slate-600">Please enter your new information below. It will be sent to an administrator for review.</p>
                
                {modalType === ChangeRequestType.Address && (<div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6 pt-2 border-t"><div className="sm:col-span-6"><label htmlFor="street" className="block text-sm">Street address</label><input type="text" name="street" id="street" value={addressData.street} onChange={e => setAddressData(p => ({...p, street: e.target.value}))} className={inputClass} /></div><div className="sm:col-span-2"><label htmlFor="city" className="block text-sm">City</label><input type="text" name="city" id="city" value={addressData.city} onChange={e => setAddressData(p => ({...p, city: e.target.value}))} className={inputClass} /></div><div className="sm:col-span-2"><label htmlFor="province" className="block text-sm">Province</label><select id="province" name="province" value={addressData.province} onChange={e => setAddressData(p => ({...p, province: e.target.value as Province}))} className={inputClass}>{Object.values(Province).map(p => <option key={p} value={p}>{p}</option>)}</select></div><div className="sm:col-span-2"><label htmlFor="postalCode" className="block text-sm">Postal code</label><input type="text" name="postalCode" id="postalCode" value={addressData.postalCode} onChange={e => setAddressData(p => ({...p, postalCode: e.target.value}))} className={inputClass} /></div></div>)}
                
                {modalType === ChangeRequestType.PhoneNumber && (<div className="pt-2 border-t space-y-2">{phoneNumbers.map((phone, index) => (<div key={index} className="flex items-center space-x-2"><select value={phone.type} onChange={(e) => setPhoneNumbers(p => p.map((ph, i) => i === index ? {...ph, type: e.target.value} : ph))} className={`block w-1/3 ${inputClass}`}>{phoneTypes.map(type => <option key={type} value={type}>{type}</option>)}</select><input type="tel" value={phone.number} onChange={(e) => setPhoneNumbers(p => p.map((ph, i) => i === index ? {...ph, number: e.target.value} : ph))} className={`block w-2/3 ${inputClass}`} placeholder="e.g., 416-555-0199" /><button type="button" onClick={() => setPhoneNumbers(p => p.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></div>))}<Button type="button" variant="secondary" size="sm" onClick={() => setPhoneNumbers(p => [...p, {type: phoneTypes[0], number: ''}])} className="mt-2">Add Phone</Button></div>)}
                
                {modalType === ChangeRequestType.EmailAddress && (<div className="pt-2 border-t space-y-2">{emailAddresses.map((email, index) => (<div key={index} className="flex items-center space-x-2"><select value={email.type} onChange={(e) => setEmailAddresses(p => p.map((em, i) => i === index ? {...em, type: e.target.value} : em))} className={`block w-1/3 ${inputClass}`}>{emailTypes.map(type => <option key={type} value={type}>{type}</option>)}</select><input type="email" value={email.address} onChange={(e) => setEmailAddresses(p => p.map((em, i) => i === index ? {...em, address: e.target.value} : em))} className={`block w-2/3 ${inputClass}`} placeholder="e.g., name@example.com" /><button type="button" onClick={() => setEmailAddresses(p => p.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></div>))}<Button type="button" variant="secondary" size="sm" onClick={() => setEmailAddresses(p => [...p, {type: emailTypes[0], address: ''}])} className="mt-2">Add Email</Button></div>)}
                
                {modalType === ChangeRequestType.SIN && (<div className="pt-2 border-t"><label htmlFor="sin" className="block text-sm">New Social Insurance Number</label><input type="text" id="sin" value={sin} onChange={e => setSin(e.target.value)} className={`${inputClass} font-mono`} placeholder="000-000-000" /></div>)}
                
                {modalType === ChangeRequestType.BankDetails && (<div className="pt-2 border-t space-y-2">{bankAccounts.map((acc, index) => (<div key={acc.id || index} className="p-2 border rounded-lg bg-slate-50 relative"><div className="grid grid-cols-1 md:grid-cols-3 gap-2"><div><label className="text-xs">Institution</label><input type="text" value={acc.institution} onChange={e => setBankAccounts(b => b.map((a,i) => i === index ? {...a, institution: e.target.value} : a))} className={inputClass} maxLength={3} /></div><div><label className="text-xs">Transit</label><input type="text" value={acc.transit} onChange={e => setBankAccounts(b => b.map((a,i) => i === index ? {...a, transit: e.target.value} : a))} className={inputClass} maxLength={5} /></div><div><label className="text-xs">Account</label><input type="text" value={acc.account} onChange={e => setBankAccounts(b => b.map((a,i) => i === index ? {...a, account: e.target.value} : a))} className={inputClass} /></div></div></div>))}<p className="text-xs text-slate-500">Note: Currently, only one bank account is supported via self-service. Please contact your administrator for direct deposit splitting.</p></div>)}

                {modalType === ChangeRequestType.ProfilePhoto && (
                    <div className="pt-2 border-t">
                        <div className="flex flex-col items-center space-y-4">
                            <p>Current Photo:</p>
                            <Avatar name={currentProfile.name} src={currentProfile.avatarUrl} size="lg" />
                            
                            <p className="font-semibold">New Photo Preview:</p>
                            {newPhoto ? (
                                <Avatar name={currentProfile.name} src={newPhoto} size="lg" />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                    <p className="text-xs text-center">No Photo Selected</p>
                                </div>
                            )}

                            <Button variant="secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                                Choose a new photo
                            </Button>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeInfo;