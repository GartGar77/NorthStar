import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { Paystub } from '../../types';

interface PaystubDetailModalProps {
  paystub: Paystub | null;
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PaystubDetailModal: React.FC<PaystubDetailModalProps> = ({ paystub, onClose }) => {
  if (!paystub) return null;

  return (
    <Modal
      isOpen={!!paystub}
      onClose={onClose}
      title={`Paystub for ${paystub.payPeriod}`}
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}
    >
        <div className="bg-white p-6 rounded-lg">
            <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-4">
                <div>
                    <h3 className="font-bold text-gray-800">NorthStar HCM Inc.</h3>
                    <p className="text-sm text-gray-600">123 Maple Street</p>
                    <p className="text-sm text-gray-600">Toronto, ON M5H 2N2</p>
                </div>
                <div className="text-right">
                    <h3 className="font-bold text-gray-800">{paystub.employeeName}</h3>
                    <p className="text-sm text-gray-600">Pay Period: {paystub.payPeriod}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Earnings */}
                <div>
                    <h4 className="text-md font-semibold text-gray-700 border-b pb-2">Earnings</h4>
                    <table className="w-full mt-2 text-sm">
                        <tbody>
                            {paystub.earnings.map((item, index) => (
                                <tr key={`earning-${index}`}>
                                    <td className="py-1">{item.description} {item.hours && <span className="text-gray-500">({item.hours} hrs)</span>}</td>
                                    <td className="py-1 text-right">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                             <tr className="font-bold border-t">
                                <td className="py-2">Gross Pay</td>
                                <td className="py-2 text-right">{formatCurrency(paystub.grossPay)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Deductions */}
                 <div>
                    <h4 className="text-md font-semibold text-gray-700 border-b pb-2">Deductions</h4>
                    <table className="w-full mt-2 text-sm">
                        <tbody>
                             {paystub.deductions.map((item, index) => (
                                <tr key={`deduction-${index}`}>
                                    <td className="py-1">{item.description}</td>
                                    <td className="py-1 text-right text-red-600">-{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                           <tr className="font-bold border-t">
                                <td className="py-2">Total Deductions</td>
                                <td className="py-2 text-right text-red-600">-{formatCurrency(paystub.totalDeductions)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-gray-300">
                <div className="flex justify-end">
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Gross Pay</span>
                            <span>{formatCurrency(paystub.grossPay)}</span>
                        </div>
                         <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600">Total Deductions</span>
                            <span className="text-red-600">-{formatCurrency(paystub.totalDeductions)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold mt-2 border-t pt-2">
                            <span>Net Pay</span>
                            <span className="text-green-600">${formatCurrency(paystub.netPay)}</span>
                        </div>
                    </div>
                </div>
            </div>

             <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-500">Employer Contributions</h4>
                <div className="flex justify-between text-sm mt-2 text-gray-600">
                    <span>Canada Pension Plan (CPP)</span>
                    <span>{formatCurrency(paystub.employerContributions.cpp)}</span>
                </div>
                 <div className="flex justify-between text-sm mt-1 text-gray-600">
                    <span>Employment Insurance (EI)</span>
                    <span>{formatCurrency(paystub.employerContributions.ei)}</span>
                </div>
            </div>
        </div>
    </Modal>
  );
};

export default PaystubDetailModal;