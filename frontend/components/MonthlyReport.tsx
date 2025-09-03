import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Cookies from 'js-cookie';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyReportProps {
  className?: string;
}

interface User {
  id: number;
  name: string;
}

interface ReportData {
  daily_visits: {
    date: string;
    day: string;
    count: number;
  }[];
  daily_recovery: {
    date: string;
    day: string;
    amount: number;
  }[];
  monthly_totals: {
    total_visits: number;
    total_recovery: number;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ className = '' }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // Set default date range to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);
  
  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        console.log('Fetching users from /admin/users/list');
        const response = await api.get('/admin/users/list');
        console.log('Users fetched successfully:', response.data);
        setUsers(response.data);
      } catch (err: any) {
        console.error('Failed to fetch users:', err);
        console.error('Error details:', err.response?.data, err.response?.status);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Fetch report data when date range or selected user changes
  useEffect(() => {
    console.log('useEffect triggered - startDate:', startDate, 'endDate:', endDate, 'selectedUserId:', selectedUserId);
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate, selectedUserId]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      let url = `/admin/monthly-report?start_date=${startDate}&end_date=${endDate}`;
      if (selectedUserId !== null) {
        url += `&user_id=${selectedUserId}`;
      }
      
      console.log('Fetching report data with URL:', url);
      console.log('Selected User ID:', selectedUserId, 'Type:', typeof selectedUserId);
      
      const response = await api.get(url);
      console.log('API Response:', response.data);
      setReportData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    setExportError(null);
    
    try {
      // First check if there's data to export
      if (!reportData || 
          (reportData.daily_visits.length === 0 && reportData.daily_recovery.length === 0)) {
        setExportError('No data available to export. Please select a different date range.');
        return;
      }
      
      // Create the export URL with proper encoding for cross-browser compatibility
      let exportUrl = `${api.defaults.baseURL}/admin/monthly-report/export?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&format=${encodeURIComponent(format)}`;
      if (selectedUserId !== null) {
        exportUrl += `&user_id=${encodeURIComponent(selectedUserId.toString())}`;
      }
      
      // Use axios directly through our configured api instance which already has auth headers
      try {
        const response = await api.get(`/admin/monthly-report/export`, {
          params: {
            start_date: startDate,
            end_date: endDate,
            format: format,
            ...(selectedUserId !== null && { user_id: selectedUserId })
          },
          responseType: 'blob',
          headers: {
            'Accept': format === 'csv' ? 'text/csv' : 'application/pdf',
          }
        });
        
        // Create a blob from the response data
        const blob = new Blob([response.data], {
          type: format === 'csv' ? 'text/csv' : 'application/pdf'
        });
        
        // Create a link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Create filename with user info if filtered
        const selectedUser = selectedUserId !== null ? users.find(u => u.id === selectedUserId)?.name : null;
        const userSuffix = selectedUser ? `_${selectedUser.replace(/\s+/g, '_')}` : '';
        link.download = format === 'csv' 
          ? `monthly_report${userSuffix}_${startDate}_to_${endDate}.csv` 
          : `monthly_report${userSuffix}_${startDate}_to_${endDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error: any) {
        // Handle axios error
        console.error('Export request failed:', error);
        
        let errorMessage = 'Failed to export data. Please try again.';
        
        // Try to extract error message from response
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (error.response.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
          } else if (error.response.data instanceof Blob) {
            // Try to read the blob as text to get error message
            try {
              const text = await error.response.data.text();
              const jsonError = JSON.parse(text);
              if (jsonError.detail) {
                errorMessage = jsonError.detail;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server. Please check your connection.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setExportError(err.message || 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Prepare chart data for visits
  const visitsChartData: ChartData<'line'> = {
    labels: reportData?.daily_visits.map(item => `${item.day} (${item.date})`) || [],
    datasets: [
      {
        label: 'Daily Visits',
        data: reportData?.daily_visits.map(item => item.count) || [],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.1,
      },
    ],
  };

  // Prepare chart data for recovery amounts
  const recoveryChartData: ChartData<'line'> = {
    labels: reportData?.daily_recovery.map(item => `${item.day} (${item.date})`) || [],
    datasets: [
      {
        label: 'Daily Recovery (Rs.)',
        data: reportData?.daily_recovery.map(item => item.amount) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Monthly Activity Report</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="user-select" className="text-sm font-medium text-gray-700">User:</label>
            <select
              id="user-select"
              value={selectedUserId !== null ? selectedUserId : ''}
              onChange={(e) => {
                const newUserId = e.target.value ? Number(e.target.value) : null;
                console.log('User dropdown changed:', e.target.value, '-> parsed as:', newUserId);
                setSelectedUserId(newUserId);
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-900"
              disabled={loadingUsers}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="start-date" className="text-sm font-medium text-gray-700">Start:</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-900"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="end-date" className="text-sm font-medium text-gray-700">End:</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-900"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : reportData ? (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Total Visits</h3>
              <p className="text-3xl font-bold text-blue-900">{reportData.monthly_totals.total_visits}</p>
              <p className="text-sm text-blue-700 mt-1">
                Period: {reportData.date_range.start_date} to {reportData.date_range.end_date}
              </p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-800 mb-2">Total Recovery</h3>
              <p className="text-3xl font-bold text-green-900">
                Rs.{reportData.monthly_totals.total_recovery.toFixed(2)}
              </p>
              <p className="text-sm text-green-700 mt-1">
                Period: {reportData.date_range.start_date} to {reportData.date_range.end_date}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Daily Visit Counts</h3>
              <div className="h-64">
                <Line options={chartOptions} data={visitsChartData} />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Daily Recovery Amounts</h3>
              <div className="h-64">
                <Line options={chartOptions} data={recoveryChartData} />
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mt-8">
            {exportError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {exportError}
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className={`${exporting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-md text-sm font-medium flex items-center`}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </>
                )}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className={`${exporting ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-md text-sm font-medium flex items-center`}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-right">
              Exports include all data within the selected date range
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MonthlyReport;