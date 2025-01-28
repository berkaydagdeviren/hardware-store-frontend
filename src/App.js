import React, { useState, useEffect } from 'react';
import { Settings, Camera, ArrowLeft, Plus, Minus, X, Save, Download, FileDown, Calendar, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import RetailView from './components/retail/RetailView'
import OpenAccountView from './components/openAccount/OpenAccountView';
import SettingsView from './components/settings/SettingsView';

// Mock Data
const MOCK_PRODUCTS = [
  { _id: '1', name: 'Phillips Screwdriver', code: 'PS001', price: 25.99, price2: 23.99, KDV_ORANI: 18, barcode: 'PS001123' },
  { _id: '2', name: 'Hammer', code: 'HAM001', price: 35.50, price2: 32.50, KDV_ORANI: 18, barcode: 'HAM001456' },
  { _id: '3', name: 'Measuring Tape', code: 'MT001', price: 15.99, price2: 14.50, KDV_ORANI: 18, barcode: 'MT001789' },
  { _id: '4', name: 'Wrench Set', code: 'WS001', price: 89.99, price2: 85.99, KDV_ORANI: 18, barcode: 'WS001012' }
];

const MOCK_COMPANIES = [
  { _id: '1', name: 'BuildRight Construction' },
  { _id: '2', name: 'Pro Hardware Solutions' },
  { _id: '3', name: 'City Builders Inc.' },
  { _id: '4', name: 'Metal Works Ltd.' }
];

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// BarcodeScanner Component
const BarcodeScanner = ({ onScan, onClose }) => {
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        setStream(mediaStream);
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Modal isOpen={true} onClose={onClose} title="Scan Barcode">
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={video => {
            if (video && stream) {
              video.srcObject = stream;
              video.play();
            }
          }}
          className="w-full h-full object-cover"
        />
      </div>
    </Modal>
  );
};

// Retail View Component


// Main App Component
const App = () => {
  const [currentView, setCurrentView] = useState('main');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            2B
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {currentView !== 'main' && (
              <button
                onClick={() => setCurrentView('main')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}
            <h1 className="text-xl font-bold">
              {currentView === 'main' ? '2B Hırdavat' :
               currentView === 'retail' ? 'Retail Sale' :
               currentView === 'openAccount' ? 'Open Account' :
               'Settings'}
            </h1>
          </div>
          <button
            onClick={() => setCurrentView('settings')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      {currentView === 'main' && (
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 shadow-xl cursor-pointer"
              onClick={() => setCurrentView('retail')}
            >
              <h2 className="text-2xl font-bold text-white mb-2">Perakende</h2>
              <p className="text-gray-100">Perakende işlemlerini yönet</p>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-6 shadow-xl cursor-pointer"
              onClick={() => setCurrentView('openAccount')}
            >
              <h2 className="text-2xl font-bold text-white mb-2">Açık Hesap</h2>
              <p className="text-gray-100">Firmalara irsaliye işlemleri</p>
            </motion.div>
          </div>
        </div>
      )}

      {currentView === 'retail' && <RetailView />}
      {currentView === 'openAccount' && <div> <OpenAccountView/> </div>}
      {currentView === 'settings' && <div> <SettingsView/> </div>}
    </div>
  );
};

export default App;