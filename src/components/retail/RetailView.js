import React, { useState, useEffect } from 'react';
import { Camera, Plus, Minus, X, Save } from 'lucide-react';
import BarcodeScanner from "../barcode/BarcodeScanner.js"



const RetailView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const employees = ["Seçkin", "Yiğit", "Berkay"];

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://apii-iviq.onrender.com/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        // Set some default products in case of API failure
        setProducts([
          { _id: '1', name: 'Phillips Screwdriver', code: 'PS001', price: 25.99, price2: 23.99, KDV_ORANI: 18 },
          { _id: '2', name: 'Hammer', code: 'HAM001', price: 35.50, price2: 32.50, KDV_ORANI: 18 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products when search term changes
  useEffect(() => {
    if (!searchTerm || !products) {
      setFilteredProducts([]);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = products.filter(product => 
      (product?.name?.toLowerCase().includes(searchTermLower) || 
       product?.code?.toLowerCase().includes(searchTermLower))
    ).slice(0, 10);

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

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

  const addProduct = (product, quantity = 1) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => 
          p._id === product._id ? { ...p, quantity: p.quantity + quantity } : p
        );
      }
      return [...prev, { ...product, quantity, usePrice2: false }];
    });
    setSearchTerm('');
    setFilteredProducts([]);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setSelectedProducts(prev =>
      prev.map(p => p._id === productId ? { ...p, quantity: newQuantity } : p)
    );
  };

  const togglePrice = (productId) => {
    setSelectedProducts(prev =>
      prev.map(p => p._id === productId ? { ...p, usePrice2: !p.usePrice2 } : p)
    );
  };


  const handleScan = (result) => {
    try {
      // Decode the base64 QR data
      const decodedString = b64_to_utf8(result.data);
      console.log('Decoded string:', decodedString); // For debugging
      
      // Parse the JSON data
      const productData = JSON.parse(decodedString);
      console.log('Product data:', productData); // For debugging
  
      // Close scanner
      setShowScanner(false);
      
      // Add the scanned product using your existing addProduct function
      addProduct(productData);
      
    } catch (error) {
      console.error('Error processing scanned data:', error);
      alert('Invalid QR code or scanning error');
    }
  };
  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p._id !== productId));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, product) => {
      const price = product.usePrice2 && product.price2 ? product.price2 : product.price;
      const subtotal = price * product.quantity;
      const tax = subtotal * (product.KDV_ORANI / 100);
      return total + subtotal + tax;
    }, 0);
  };

  const handleSave = async () => {
    if (!selectedEmployee || selectedProducts.length === 0) {
      alert('Lütfen bir çalışan seçin ve ürün ekleyin');
      return;
    }

    const record = {
      date: new Date(),
      employee: selectedEmployee,
      products: selectedProducts.map(p => ({
        productId: p._id,
        code: p.code,
        name: p.name,
        quantity: p.quantity,
        price: p.usePrice2 && p.price2 ? p.price2 : p.price,
        tax: p.KDV_ORANI,
        priceType: p.usePrice2 ? 2 : 1
      })),
      total: calculateTotal()
    };

    console.log('Saving record:', record);

    const response = await fetch('https://apii-iviq.onrender.com/api/retail-records', {
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
    setSelectedProducts([]);
    setSelectedEmployee('');
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
        {/* Left Column - Product Search */}
        <div>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Ürünleri Arayın..."
              className="flex-1 p-3 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Tara
            </button>
          </div>

          {filteredProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg mt-2">
              {filteredProducts.map(product => (
                <div
                key={product._id}
                className="p-3 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-gray-600">Kod: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{Number(product.price || 0).toFixed(2)} TL</p>
                    {product.price2 ? (
                      <p className="text-sm text-gray-600">{Number(product.price2).toFixed(2)} TL</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
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
              </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Selected Products */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold mb-4">Eklenen Ürünler</h2>
          
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
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
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
                  
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => togglePrice(product._id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        !product.usePrice2 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Fiyat 1: {(product.price || 0).toFixed(2)} TL
                    </button>
                    <button
                      onClick={() => togglePrice(product._id)}
                      disabled={!product.price2}
                      className={`px-3 py-1 rounded-full text-sm ${
                        product.usePrice2 && product.price2
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      } ${!product.price2 && 'opacity-50 cursor-not-allowed'}`}
                    >
                      Fiyat 2: {(product.price2 || 0).toFixed(2)} TL
                    </button>
                  </div>
                  
                  <span className="font-semibold">
                    {((product.usePrice2 ? (product.price2 || 0) : (product.price || 0)) * 
                      product.quantity).toFixed(2)} TL
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Toplam:</span>
              <span className="text-xl font-bold">{calculateTotal().toFixed(2)} TL</span>
            </div>

            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4"
            >
              <option value="">Çalışan Seç</option>
              {employees.map(emp => (
                <option key={emp} value={emp}>{emp}</option>
              ))}
            </select>

            <button
              onClick={handleSave}
              disabled={!selectedEmployee || selectedProducts.length === 0}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 
                disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Satışı Tamamla
            </button>
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner 
        onScan={handleScan}
        onClose={() => setShowScanner(false)} 
      />
      )}
    </div>
  );
};

export default RetailView;