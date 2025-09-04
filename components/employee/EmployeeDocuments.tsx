import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { Employee, SuperAdmin, EmployeeDocument, DocumentCategory } from '../../types';
import { DocumentTextIcon, ArrowUpTrayIcon } from '../icons/Icons';
import { uploadEmployeeDocument, getCompanySettings } from '../../services/api';

interface EmployeeDocumentsProps {
  session: { user: Employee | SuperAdmin; tenantId: string };
}

const EmployeeDocuments: React.FC<EmployeeDocumentsProps> = ({ session }) => {
    const currentUser = session.user as Employee;
    const [documents, setDocuments] = useState<EmployeeDocument[]>(currentUser.documents || []);
    
    // State for the upload form
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string|null>(null);
    const [newDocFile, setNewDocFile] = useState<File|null>(null);
    const [newDocName, setNewDocName] = useState('');

    // State for dynamic categories
    const [docCategories, setDocCategories] = useState<string[]>([]);
    const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('');

     useEffect(() => {
        getCompanySettings(session.tenantId)
            .then(settings => {
                const categories = settings.configurations?.documentCategories || ['Other'];
                setDocCategories(categories);
                setNewDocCategory(categories[0] || 'Other');
            })
            .catch(console.error);
    }, [session.tenantId]);

    const handleDownload = (doc: EmployeeDocument) => {
        alert(`Simulating download of "${doc.name}"...`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewDocFile(file);
            setNewDocName(file.name); // Pre-fill name with filename
        }
    };

    const handleUpload = async () => {
        if (!newDocFile || !newDocName) {
            setUploadError("Please select a file and provide a document name.");
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        try {
            const uploaderName = currentUser.profileHistory[0].profile.name;
            const newDocument = await uploadEmployeeDocument(
                currentUser.id,
                { name: newDocName, category: newDocCategory, file: newDocFile },
                uploaderName,
                'Employee', // Uploaded by is always 'Employee' from this portal
                true,       // Always visible to both employee and admin
                session.tenantId!
            );
            setDocuments(prev => [...prev, newDocument].sort((a,b) => b.uploadDate.localeCompare(a.uploadDate)));
            // Reset form
            setNewDocFile(null);
            setNewDocName('');
            setNewDocCategory(docCategories[0] || 'Other');
        } catch (err) {
            setUploadError("Failed to upload document. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const visibleDocuments = documents.filter(doc => doc.visibleToEmployee);

    return (
        <div className="space-y-6">
            <Card title="My Documents">
                <p className="text-slate-500 mb-6">View and download documents shared by your administrator, or upload your own for them to review.</p>
                
                {visibleDocuments.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="font-semibold text-slate-700 mt-2">No Documents Found</p>
                        <p className="text-slate-500 mt-1">Your administrator has not shared any documents with you yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-200 border rounded-md">
                        {visibleDocuments.map(doc => (
                            <li key={doc.id} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50">
                                <div className="flex items-center">
                                    <DocumentTextIcon className="h-6 w-6 text-slate-400" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {doc.category} &bull; Uploaded {doc.uploadDate} by {doc.uploaderName}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => handleDownload(doc)}>Download</Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card title="Upload a Document">
                <p className="text-slate-500 mb-6">Upload a document to share with your administrator. It will be visible to them immediately.</p>
                {uploadError && <p className="text-sm text-red-600 my-2">{uploadError}</p>}
                
                <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-slate-300 px-6 pt-5 pb-6">
                    <div className="space-y-1 text-center">
                        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-brand-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2 hover:text-brand-dark">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange}/>
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500">PDF, PNG, JPG, DOCX up to 10MB</p>
                    </div>
                </div>

                {newDocFile && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 border">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Document Name</label>
                            <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <select value={newDocCategory} onChange={e => setNewDocCategory(e.target.value as DocumentCategory)} className="mt-1 block w-full rounded-md border-slate-300">
                            {docCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2 text-right">
                            <Button type="button" variant="primary" onClick={handleUpload} disabled={isUploading}>
                                {isUploading ? 'Uploading...' : 'Upload Document'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default EmployeeDocuments;
