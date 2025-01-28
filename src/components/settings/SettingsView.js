import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import BarcodeManager from '../barcode/BarcodeManager';
import RetailRecordsManager from '../retail/RetailRecordsManager';
import OpenAccountRecordsManager from '../openAccount/OpenAccountRecordsManager';

const SettingsSection = ({ title, children, isOpen, onToggle }) => (
  <div className="border rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100"
    >
      <span className="text-lg font-semibold">{title}</span>
      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </button>
    {isOpen && <div className="p-4">{children}</div>}
  </div>
);

const SettingsView = () => {
  const [openSections, setOpenSections] = useState(new Set());

  const toggleSection = (section) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const isSectionOpen = (section) => openSections.has(section);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <SettingsSection
        title="Barkod Yönetimi"
        isOpen={isSectionOpen('barcodes')}
        onToggle={() => toggleSection('barcodes')}
      >
        <BarcodeManager isExpanded={isSectionOpen('barcodes')} />
      </SettingsSection>

      <SettingsSection
        title="Perakende Kayıtlarını Görüntüle Ve Yönet"
        isOpen={isSectionOpen('retail')}
        onToggle={() => toggleSection('retail')}
      >
        {/* RetailRecordsManager component will go here */}
        <RetailRecordsManager isExpanded={isSectionOpen('retail')} />
      </SettingsSection>

      <SettingsSection
        title="Açık Hesap Kayıtlarını Görüntüle Ve Yönet"
        isOpen={isSectionOpen('openAccount')}
        onToggle={() => toggleSection('openAccount')}
      >
        {/* OpenAccountRecordsManager component will go here */}
        <OpenAccountRecordsManager isExpanded={isSectionOpen('openAccount')} />
      </SettingsSection>
    </div>
  );
};

export default SettingsView;