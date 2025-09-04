
import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Employee } from '../../types';

interface T4ModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

const T4Field: React.FC<{ box: string, label: string, value: string | number }> = ({ box, label, value }) => (
    <div className="border border-black p-1">
        <div className="text-xs">{label}</div>
        <div className="flex items-center">
            <div className="border-r border-black w-8 text-center font-bold mr-2">{box}</div>
            <div className="text-right flex-1 pr-1">{typeof value === 'number' ? value.toFixed(2) : value}</div>
        </div>
    </div>
);


const T4Modal: React.FC<T4ModalProps> = ({ isOpen, onClose, employee }) => {
    const profile = employee.profileHistory[0].profile;
    const ytd = employee.ytd;
    // Simplified tax calculation for demo
    const incomeTaxDeducted = ytd.grossPay * 0.18; 

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="T4 - Statement of Remuneration Paid (2023)"
            footer={
                <>
                    <Button variant="secondary" onClick={() => alert('Printing is a simulated feature.')}>Print</Button>
                    <Button variant="primary" onClick={onClose}>Close</Button>
                </>
            }
        >
            <div className="font-mono text-black bg-white p-4 border-2 border-black">
                <div className="text-center">
                    <h2 className="font-bold text-lg">T4</h2>
                    <p className="text-sm">Statement of Remuneration Paid</p>
                </div>
                <div className="grid grid-cols-2 gap-px mt-4 bg-black border-l border-t border-black">
                    <div className="bg-white p-1 text-xs col-span-1">
                        <p>Employer's name</p>
                        <p className="font-bold">NorthStar HCM Inc.</p>
                    </div>
                     <div className="bg-white p-1 text-xs col-span-1">
                        <p>Employee's name and address</p>
                        <p className="font-bold">{profile.name}</p>
                        <p>{profile.address.street}</p>
                        <p>{profile.address.city} {profile.address.province} {profile.address.postalCode}</p>
                    </div>
                     <div className="bg-white p-1 text-xs col-span-1">
                        <p>Year</p>
                        <p className="font-bold">2023</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-px mt-px bg-black border-l border-t border-black">
                    <T4Field box="14" label="Employment income" value={ytd.grossPay} />
                    <T4Field box="16" label="Employee's CPP contributions" value={ytd.cpp} />
                    <T4Field box="18" label="Employee's EI premiums" value={ytd.ei} />
                    <T4Field box="22" label="Income tax deducted" value={incomeTaxDeducted} />
                    <div className="bg-white p-1 text-xs">
                        <p>Social Insurance Number</p>
                        <p className="font-bold">{employee.payroll.canada?.sin}</p>
                    </div>
                    <T4Field box="24" label="EI insurable earnings" value={Math.min(ytd.grossPay, 61500)} />
                    <T4Field box="26" label="CPP/QPP pensionable earnings" value={Math.min(ytd.grossPay, 66600)} />
                    <div className="bg-white p-1 text-xs">
                        <p>Province of employment</p>
                        <p className="font-bold">{profile.province}</p>
                    </div>
                </div>
                 <p className="text-center text-xs mt-4">This is a simulated T4 slip for demonstration purposes only.</p>
            </div>
        </Modal>
    );
};

export default T4Modal;