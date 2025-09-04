import React, { useState } from 'react';
import Card from './ui/Card';
import { ChevronDownIcon } from './icons/Icons';
import type { Employee } from '../types';

// AccordionItem sub-component
const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center py-4 text-left text-slate-800 font-semibold hover:bg-slate-50 -mx-6 px-6"
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 text-slate-500 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="pb-4 pr-4 text-slate-600 space-y-2 prose prose-sm max-w-none">
                    {children}
                </div>
            )}
        </div>
    );
};

interface KnowledgeBaseProps {
    currentUser: Employee;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ currentUser }) => {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-800">Knowledge Base & Support</h2>
                <p className="text-slate-500 mt-1">Find answers to common questions and learn how to use NorthStar HCM.</p>
                <div className="mt-4 max-w-lg mx-auto">
                    <input
                        type="search"
                        placeholder="Search for articles..."
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 shadow-sm focus:ring-brand-primary focus:border-brand-primary"
                        // Search functionality is a placeholder for now
                    />
                </div>
            </div>

            <div className={`grid grid-cols-1 ${currentUser.isAdmin ? 'lg:grid-cols-2' : 'lg:max-w-4xl lg:mx-auto'} gap-8 items-start`}>
                {/* Administrator Section */}
                {currentUser.isAdmin && (
                    <Card title="For Administrators">
                        <div className="-mx-6 px-6">
                            <AccordionItem title="Getting Started: Initial Setup">
                                <p>Welcome to NorthStar HCM! To get your company up and running, follow these essential setup steps:</p>
                                <ol>
                                    <li><strong>Configure Company Info:</strong> Navigate to <strong>Settings &rarr; Company Info</strong>. Fill in your company's legal name, CRA Business Number, and headquarters address. This information is crucial for tax forms.</li>
                                    <li><strong>Set Payroll Schedule:</strong> In the same section, define your company's pay frequency (e.g., Bi-Weekly, Semi-Monthly) and specify the pay dates. This schedule drives all payroll calendars.</li>
                                    <li><strong>Configure Employee Data:</strong> Go to <strong>Employees &rarr; Settings</strong> to customize dropdown values for employee records, such as job statuses, phone types, and email types.</li>
                                    <li><strong>Customize Branding:</strong> Go to <strong>Settings &rarr; Branding</strong> to upload your company logo and set a primary color. This will personalize the portal for your employees.</li>
                                    <li><strong>Define Payroll Codes:</strong> Under <strong>Payroll &rarr; Settings</strong>, you can configure custom Earning and Deduction codes that are specific to your company's policies (e.g., RRSP Match, Health & Dental Premiums).</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="How to Add an Employee">
                                <p>Onboarding new team members is simple:</p>
                                <ol>
                                    <li>Navigate to the <strong>Employees</strong> section from the sidebar.</li>
                                    <li>Click the <strong>"Add Employee"</strong> button.</li>
                                    <li>Fill out the employee's profile, job, and compensation details. The hire date you enter will be the effective date for their first record.</li>
                                    <li>Switch to the <strong>Payroll</strong> tab within the modal to enter their SIN and TD1 tax credit amounts.</li>
                                    <li>(Optional) Assign time off policies and initial balances under the <strong>Time Off</strong> tab.</li>
                                    <li>Click <strong>"Add Employee"</strong> to save the new record.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="How to Bulk Import Employees">
                                <p>To quickly onboard multiple employees at once, you can use the CSV import tool. This is ideal for initial setup or hiring seasonal staff.</p>
                                <ol>
                                    <li><strong>Navigate to the Import Tool:</strong> Go to the <strong>Employees</strong> section from the sidebar. Click on the <strong>"Settings"</strong> tab. Here you will find the "Import into NorthStar HCM" card.</li>
                                    <li><strong>Download the Template:</strong> Click the <strong>"Download Template"</strong> button. This provides a CSV file with the correct headers and format. Using this template is highly recommended to avoid errors.</li>
                                    <li><strong>Fill Out the Template:</strong> Open the CSV file in a spreadsheet editor. For each new employee, fill out a row with their information. Pay close attention to required fields like <code>name</code>, <code>annualSalary</code>, <code>province</code>, and <code>payFrequency</code>. The <code>id</code> column can be left blank for new hires; the system will assign one automatically.</li>
                                    <li><strong>Upload the File:</strong> Once your template is complete, return to the same section and click <strong>"Upload CSV File"</strong> to select your saved file.</li>
                                    <li><strong>Import Data:</strong> The system will validate your file. If any errors are found, they will be displayed for you to correct in your file. If the file is valid, a success message will appear. Click the <strong>"Import Data"</strong> button to finalize the import and add the new employees to the system.</li>
                                </ol>
                                <p>After a successful import, you can view the new employees in the <strong>Employees</strong> directory.</p>
                            </AccordionItem>
                             <AccordionItem title="How to Run Payroll">
                                <p>Our guided payroll process makes pay runs quick and accurate:</p>
                                <ol>
                                    <li>Go to the <strong>Payroll</strong> section. The AI Agent will guide you.</li>
                                    <li><strong>Step 1: Select Employees.</strong> All eligible employees are selected by default. You can uncheck anyone who should not be included in this run.</li>
                                    <li><strong>Step 2: Calculate Payroll.</strong> The system will calculate gross pay, taxes, deductions, and net pay for all selected employees.</li>
                                    <li><strong>Step 3: Preview & Adjust.</strong> Review the summary. You can click the pencil icon next to any employee to make one-time adjustments (e.g., a bonus). The system will instantly recalculate their paystub.</li>
                                    <li><strong>Step 4: Submit Payroll.</strong> Once you confirm, the payroll is finalized. This action cannot be undone. You can then download the bank file for direct deposits.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Connecting for Tax Remittances">
                                <p>Streamline your compliance by connecting directly to government tax agencies for real-time remittances. This eliminates the need for manual payments after each payroll.</p>
                                <ol>
                                    <li>Navigate to <strong>Integrations</strong> from the sidebar.</li>
                                    <li>Find the card titled <strong>"Government & Tax Remittance"</strong>.</li>
                                    <li>
                                        For federal and non-Quebec provincial taxes, click <strong>"Connect"</strong> next to the <strong>Canada Revenue Agency (CRA)</strong> option. You will be guided through a secure process to authorize NorthStar HCM to make payments on your behalf.
                                    </li>
                                     <li>
                                        If you have employees in Quebec, click <strong>"Connect"</strong> next to the <strong>Revenu Québec</strong> option to authorize remittances for provincial taxes and QPP.
                                    </li>
                                </ol>
                                <p>Once connected, the system can automatically push the required tax payments to the respective agencies immediately after you finalize a payroll run, ensuring you are always on time with your source deductions.</p>
                            </AccordionItem>
                             <AccordionItem title="Connecting to Benefits Providers">
                                <p>Automate your benefits administration by connecting directly with your insurance providers. This integration helps keep employee enrollments and payroll deductions in sync.</p>
                                <ol>
                                    <li>Navigate to <strong>Integrations</strong> from the sidebar.</li>
                                    <li>Find the card titled <strong>"Benefits & Insurance Providers"</strong>.</li>
                                    <li>
                                        Click <strong>"Connect"</strong> next to your provider (e.g., Sun Life, Manulife, Canada Life). You will be guided through a secure authorization process.
                                    </li>
                                </ol>
                                <p>Once connected, new hires can be automatically enrolled in your benefits plan, and any changes to employee contribution amounts will be reflected in payroll, reducing manual data entry and potential errors.</p>
                            </AccordionItem>
                            <AccordionItem title="How to Issue a Record of Employment (ROE)">
                                <p>When an employee stops working (e.g., termination, leave of absence), you must issue a Record of Employment. This is a legal requirement for Service Canada.</p>
                                <ol>
                                    <li>Navigate to the <strong>Reports</strong> section from the sidebar.</li>
                                    <li>Find the card titled <strong>"Record of Employment (ROE)"</strong>.</li>
                                    <li>Using the dropdown menu, select the employee for whom you are issuing the ROE.</li>
                                    <li>Select the appropriate reason for issuing the ROE from the list of official CRA codes.</li>
                                    <li>Enter the employee's <strong>Last Day Worked</strong> and the <strong>Final Pay Period End Date</strong>.</li>
                                    <li>Click the <strong>"Generate ROE"</strong> button.</li>
                                    <li>A preview modal will appear with a simplified version of the ROE. Verify that all the information is correct.</li>
                                    <li>Click <strong>"Download as PDF"</strong> (simulated) to get the document, which you would then submit to Service Canada.</li>
                                </ol>
                            </AccordionItem>
                            <AccordionItem title="Managing Time Off">
                                <p>Administrators can manage company-wide time off policies and approve requests.</p>
                                <ul>
                                    <li><strong>Create Policies:</strong> Go to <strong>Time Off &rarr; Settings</strong>. Here you can create new policies for vacation, sick days, etc., specifying accrual rates and rules for your jurisdiction.</li>
                                    <li><strong>Approve Requests:</strong> The <strong>Time Off &rarr; Requests</strong> tab shows all pending requests. You can approve or deny them here. Approved requests will automatically appear on the Company Calendar.</li>
                                </ul>
                            </AccordionItem>
                        </div>
                    </Card>
                )}

                {/* Employee Section */}
                <Card title="For Employees">
                    <div className="-mx-6 px-6">
                        <AccordionItem title="How to View Your Paystub">
                            <p>You can access all your historical paystubs at any time.</p>
                            <ol>
                                <li>From the sidebar, click on <strong>My Paystubs</strong>.</li>
                                <li>You will see a list of all your pay periods.</li>
                                <li>Click the <strong>"View Details"</strong> button next to any paystub to see a full breakdown of your earnings, deductions, and net pay.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="How to Request Time Off">
                             <p>Submitting a time off request is easy:</p>
                            <ol>
                                <li>Navigate to <strong>My Time Off</strong> from the sidebar.</li>
                                <li>Click the <strong>"Request Time Off"</strong> button.</li>
                                <li>In the modal, select the type of leave (e.g., Vacation), choose the start and end dates, and add an optional note for your manager.</li>
                                <li>Click <strong>"Submit Request"</strong>. You can view the status of your request on the "My Requests" table.</li>
                            </ol>
                        </AccordionItem>
                        <AccordionItem title="How to Submit Your Timesheet">
                            <p>If you are an hourly employee, you must submit a timesheet for each pay period.</p>
                            <ol>
                                <li>Go to the <strong>Timesheets</strong> section from the sidebar.</li>
                                <li>The current week will be displayed. You can navigate to previous or future weeks using the buttons at the top.</li>
                                <li>Enter the hours you worked each day in the "Work Hours" row. The totals will update automatically.</li>
                                <li>When you are finished, you can either <strong>"Save as Draft"</strong> to continue later or <strong>"Submit for Approval"</strong> to send it to your manager.</li>
                            </ol>
                            <p><strong>Note:</strong> Once a timesheet is submitted, it cannot be edited unless it is rejected by your manager.</p>
                        </AccordionItem>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default KnowledgeBase;