import React, { useState, useEffect } from 'react';
import { Camera, Plus, Minus, X, Save } from 'lucide-react';
import BarcodeScanner from '../barcode/BarcodeScanner';

const OpenAccountView = () => {
  const [buyerName, setBuyerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [editingRecord, setEditingRecord] = useState();

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch companies
        const companiesResponse = await fetch('https://apii-iviq.onrender.com/api/companies');
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData || []);

        // Fetch products
        const productsResponse = await fetch('https://apii-iviq.onrender.com/api/products');
        const productsData = await productsResponse.json();
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter companies based on search
  useEffect(() => {
    if (!searchTerm?.trim() || !companies?.length) {
      setFilteredCompanies([]);
      return;
    }

    try {
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = companies.filter(company => 
        company?.name?.toLowerCase()?.includes(searchTermLower)
      ).slice(0, 10);
      setFilteredCompanies(filtered);
    } catch (error) {
      console.error('Error filtering companies:', error);
      setFilteredCompanies([]);
    }
  }, [searchTerm, companies]);

  // Filter products based on search
  useEffect(() => {
    if (!productSearchTerm?.trim() || !products?.length || !selectedCompany) {
      setFilteredProducts([]);
      return;
    }

    try {
      const searchTermLower = productSearchTerm.toLowerCase();
      const filtered = products.filter(product => 
        product?.name?.toLowerCase()?.includes(searchTermLower) ||
        product?.code?.toLowerCase()?.includes(searchTermLower)
      ).slice(0, 10);
      setFilteredProducts(filtered);
    } catch (error) {
      console.error('Error filtering products:', error);
      setFilteredProducts([]);
    }
  }, [productSearchTerm, products, selectedCompany]);

  const b64_to_utf8 = (str) => {
    try {
      return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (error) {
      console.error('Decoding error for string:', str);
      throw error;
    }
  };
  const checkExistingRecord = async (companyId) => {
    try {
      // Get today's date at start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/open-account-records?company=${companyId}&date=${today.toISOString()}`
      );
      
      if (!response.ok) throw new Error('Failed to check records');
      const records = await response.json();
  
      if (records.length > 0) {
        const company = records[0].company.name;
        const useExisting = window.confirm(
          `Bu firma için bugün kayıt bulunmakta. (${company}) Bu kaydı kullanmaya devam etmek ister misiniz?`
        );
  
        if (useExisting) {
          // Load existing record for editing
          setEditingRecord(records[0]);
          return true; // Indicates we're using existing record
        }
      }
      return false; // Indicates we should create new record
    } catch (error) {
      console.error('Error checking existing records:', error);
      return false;
    }
  };

  const handleCompanySelect = async (company) => {
    //setSelectedCompany(company);
    setSearchTerm('');
    setFilteredCompanies([]);
    const hasExistingRecord = await checkExistingRecord(company);
    // Check for existing record today
    try {
      if (!hasExistingRecord) {
        // Create new record
        setSelectedCompany(company);
        // Your existing new record creation logic
      }
      // If hasExistingRecord is true, the existing record is already loaded in editingRecord

    } catch (error) {
      console.error('Error checking existing record:', error);
    }
  };

  const addProduct = (product, quantity = 1) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => 
          p._id === product._id ? { ...p, quantity: p.quantity + quantity } : p
        );
      }
      return [...prev, { ...product, quantity, priceType: "1" }];
    });
    setProductSearchTerm('');
    setFilteredProducts([]);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setSelectedProducts(prev =>
      prev.map(p => p._id === productId ? { ...p, quantity: newQuantity } : p)
    );
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== productId));
  };

      const handleSave = async () => {
    if (!selectedCompany || !selectedProducts.length) {
      alert('Lütfen firma seçin ve ürün ekleyin');
      return;
    }

    const record = {
      company: selectedCompany._id,
      date: new Date(),
      buyerName: buyerName.trim() || null,
      products: selectedProducts.map(p => ({
        productId: p._id,
        code: p.code,
        name: p.name,
        quantity: p.quantity,
        tax: p.KDV_ORANI,
        priceType: p.priceType || "1"
      }))
    };
    const response = await fetch('https://apii-iviq.onrender.com/api/open-account-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const savedRecord = await response.json();
    console.log('Record saved successfully:', savedRecord);

    // Clear form
    setSelectedProducts([]);
    setBuyerName('');
    // Add any other state clearing you need

    // Optional: Show success message
    alert('Kayıt Tamamlandı!');
    console.log('Saving record:', record);
    
    // Reset form
    setSelectedProducts([]);
    setSelectedCompany(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Company & Product Search */}
        <div className="space-y-4">
          {/* Company Selection */}
          <div className="relative">
            <input
              type="text"
              placeholder="Firma Arayın..."
              className="w-full p-3 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {filteredCompanies.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCompanies.map(company => (
                  <div
                    key={company._id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleCompanySelect(company)}
                  >
                    <h3 className="font-medium">{company.name}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Search - Only show if company is selected */}
          {selectedCompany && (
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full p-3 border rounded-lg"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                />
                
            
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Tara
            </button>
          

                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product._id}
                        className="p-3 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex justify-between mb-2">
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-gray-600">Kod: {product.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            defaultValue="1"
                            className="w-20 p-1 border rounded text-center"
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              e.target.value = qty;
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.target.parentNode.querySelector('input');
                              const qty = parseInt(input.value) || 1;
                              addProduct(product, qty);
                            }}
                            className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Ekle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Selected Products */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {selectedCompany ? selectedCompany.name : 'Bir Firma Seçin'}
            </h2>
          </div>

          {selectedProducts.length > 0 ? (
            <>
              <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto mb-4">
                {selectedProducts.map(product => (
                  <div
                    key={product._id}
                    className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-600">Kod: {product.code}</p>
                      </div>
                      <button
                        onClick={() => removeProduct(product._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product._id, product.quantity - 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{product.quantity}</span>
                        <button
                          onClick={() => updateQuantity(product._id, product.quantity + 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProducts(prev =>
                            prev.map(p =>
                              p._id === product._id
                                ? { ...p, priceType: p.priceType === "1" ? "2" : "1" }
                                : p
                            )
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          product.priceType === "2"
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Fiyat {product.priceType || "1"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Buyer Name (Optional)"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
                
                <button
                  onClick={handleSave}
                  className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Kaydı Tamamla
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {selectedCompany
                ? 'Ürün arayın ve ekleyin'
                : 'Başlamak için bir firma seçin'}
            </div>
          )}
        </div>
      </div>
      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            // Handle barcode scan
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default OpenAccountView;