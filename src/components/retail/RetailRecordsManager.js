import React, { useState, useEffect } from 'react';
import { Calendar, Download, Edit, Trash2, X, Save, Plus, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';

const RetailRecordsManager = ({ isExpanded }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const employees = ["Seçkin", "Yiğit", "Berkay"];

  useEffect(() => {
    if (isExpanded) {
      fetchProducts();
    }
  }, [isExpanded]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://apii-iviq.onrender.com/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    if (searchProduct.trim()) {
      const filtered = products.filter(product => 
        (product.name?.toLowerCase() || '').includes(searchProduct.toLowerCase()) ||
        (product.code?.toLowerCase() || '').includes(searchProduct.toLowerCase())
      ).slice(0, 10);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchProduct, products]);

  const fetchRecords = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      // Convert dates to ISO format for API
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Set end date to end of day to include the entire day
      end.setHours(23, 59, 59, 999);
      
      // Create URL with proper date range
      const url = new URL('https://apii-iviq.onrender.com/api/retail-records');
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
      url.search = params.toString();

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      const validDatesData = await data.filter(records => {
        return records.date.slice(0, 10) >= startDate && records.date.slice(0, 10) <= endDate
      })
      
      // Sort records by date (newest first)
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(validDatesData);
    } catch (error) {
      console.error('Error fetching records:', error);
      alert('Error fetching records');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord({
      ...record,
      products: record.products.map(p => ({...p}))  // Deep copy products
    });
  };

  const updateProductQuantity = (index, change) => {
    setEditingRecord(prev => {
      const newProducts = [...prev.products];
      newProducts[index] = {
        ...newProducts[index],
        quantity: Math.max(1, newProducts[index].quantity + change)
      };
      return {
        ...prev,
        products: newProducts
      };
    });
  };

  const togglePriceType = (index) => {
    setEditingRecord(prev => {
      const newProducts = [...prev.products];
      const product = newProducts[index];
      newProducts[index] = {
        ...product,
        usePrice2: !product.usePrice2,
        price: !product.usePrice2 ? product.price2 : product.price
      };
      return {
        ...prev,
        products: newProducts
      };
    });
  };

  const removeProduct = (index) => {
    setEditingRecord(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const addProduct = (product) => {
    setEditingRecord(prev => ({
      ...prev,
      products: [...prev.products, {
        ...product,
        quantity: 1,
        usePrice2: false,
        price: product.price
      }]
    }));
    setSearchProduct('');
    setFilteredProducts([]);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/retail-records/${editingRecord._id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingRecord)
        }
      );
      
      if (!response.ok) throw new Error('Failed to update record');
      
      setRecords(prev => prev.map(record => 
        record._id === editingRecord._id ? editingRecord : record
      ));
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record');
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(
        `https://apii-iviq.onrender.com/api/retail-records/${recordId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete record');
      setRecords(prev => prev.filter(record => record._id !== recordId));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record');
    }
  };

  const exportToExcel = () => {
    if (records.length === 0) {
      alert('No records to export');
      return;
    }

    const formattedRecords = records.flatMap(record => {
      return record.products.map(product => ({
        Date: new Date(record.date).toLocaleDateString('tr-TR'),
        Employee: record.employee,
        Product: product.name,
        Code: product.code,
        Quantity: product.quantity,
        'Price Type': product.usePrice2 ? 'Price 2' : 'Price 1',
        'Unit Price': product.price,
        'Total Price': product.price * product.quantity,
        'Tax Rate': product.KDV_ORANI + '%',
        'Tax Amount': (product.price * product.quantity * (product.KDV_ORANI / 100)).toFixed(2)
      }));
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedRecords);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Date
      { wch: 15 },  // Employee
      { wch: 30 },  // Product
      { wch: 15 },  // Code
      { wch: 10 },  // Quantity
      { wch: 10 },  // Price Type
      { wch: 12 },  // Unit Price
      { wch: 12 },  // Total Price
      { wch: 10 },  // Tax Rate
      { wch: 12 }   // Tax Amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Retail Records');
    XLSX.writeFile(wb, `retail_records_${startDate}_to_${endDate}.xlsx`);
  };

  if (!isExpanded) return null;

  return (
    <div className="space-y-4">
      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Başlangıç Tarihi</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bitiş Tarihi</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 
              disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Kayıtları Görüntüle
          </button>
        </div>
      </div>

      {/* Export Button */}
      <div>
        <button
          onClick={exportToExcel}
          disabled={records.length === 0 || loading}
          className="w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600
            disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Excel'e Aktar
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Records Table */}
      {!loading && records.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Employee</th>
                <th className="px-4 py-2 text-left">Products</th>
                <th className="px-4 py-2 text-left">Total</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record._id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(record.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-2">{record.employee}</td>
                  <td className="px-4 py-2">
                    {record.products.length} items
                  </td>
                  <td className="px-4 py-2">
                    {record.products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)} TL
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(record)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(record._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Record</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Employee</label>
                <select
                  value={editingRecord.employee}
                  onChange={(e) => setEditingRecord(prev => ({
                    ...prev,
                    employee: e.target.value
                  }))}
                  className="w-full p-2 border rounded-lg"
                >
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Product Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products to add..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product._id}
                        onClick={() => addProduct(product)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">{product.code}</div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {product.price} TL
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Products List */}
              <div className="space-y-2">
                {editingRecord.products.map((product, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.code}</div>
                      </div>
                      <button
                        onClick={() => removeProduct(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateProductQuantity(index, -1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{product.quantity}</span>
                        <button
                          onClick={() => updateProductQuantity(index, 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => togglePriceType(index)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            !product.usePrice2 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Price 1: {product.price.toFixed(2)} TL
                        </button>
                        <button
                          onClick={() => togglePriceType(index)}
                          disabled={!product.price2}
                          className={`px-3 py-1 rounded-full text-sm ${
                            product.usePrice2 && product.price2
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          } ${!product.price2 && 'opacity-50 cursor-not-allowed'}`}
                        >
                          Price 2: {(product.price2 || 0).toFixed(2)} TL
                        </button>
                      </div>
                      
                      <span className="font-semibold">
                        {(product.price * product.quantity).toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold">
                    {editingRecord.products.reduce((sum, p) => 
                      sum + (p.price * p.quantity), 0
                    ).toFixed(2)} TL
                  </span>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                      flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Records Message */}
      {!loading && records.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Belirtilen Tarih İçin Kayıt Bulunamadı.
        </div>
      )}
    </div>
  );
};

export default RetailRecordsManager;