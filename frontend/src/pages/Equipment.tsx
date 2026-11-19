import React, { useState, useEffect } from 'react';
import {
  Truck,
  Wrench,
  Fuel,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { formatCurrency, formatMetricNumber } from '../utils/formatters';
import SearchableSelect from '../components/common/SearchableSelect';

interface EquipmentLog {
  id: string;
  logDate: string;
  startHours: number;
  endHours: number;
  hoursWorked: number;
  fuelConsumedLitres: number;
  workDescription?: string;
  operatorName?: string;
  project?: { code: string; name: string };
}

interface MaintenanceRecord {
  id: string;
  maintenanceDate: string;
  maintenanceType: string;
  description: string;
  cost: number;
  servicedBy?: string;
  nextDueHours?: number;
  nextDueDate?: string;
}

interface EquipmentAsset {
  id: string;
  code: string;
  name: string;
  assetType: 'OWNED' | 'RENTED';
  category: string;
  modelNo?: string;
  serialNo?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED';
  purchaseDate?: string;
  purchasePrice?: number;
  rentalRateType?: string;
  rentalRate?: number;
  hoursRunTotal: number;
  currentOperator?: string;
  currentProjectId?: string;
  logs: EquipmentLog[];
  maintenances: MaintenanceRecord[];
}

export const Equipment: React.FC = () => {
  const { hasRole } = useAuth();
  const { selectedProjectId, projects } = useProject();

  const [equipmentList, setEquipmentList] = useState<EquipmentAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<EquipmentAsset | null>(null);
  const [assetDetailTab, setAssetDetailTab] = useState<'telemetry' | 'logbook' | 'maintenance' | 'specs'>('telemetry');

  // Auto-select first asset on load or keep fresh data synced
  useEffect(() => {
    if (equipmentList.length > 0 && !selectedAsset) {
      setSelectedAsset(equipmentList[0]);
    } else if (selectedAsset && equipmentList.length > 0) {
      const fresh = equipmentList.find((e) => e.id === selectedAsset.id);
      if (fresh) setSelectedAsset(fresh);
    }
  }, [equipmentList]);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showUsageModal, setShowUsageModal] = useState<boolean>(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);

  // Form states
  const [addForm, setAddForm] = useState({
    code: '',
    name: '',
    assetType: 'OWNED',
    category: 'EARTHMOVING',
    modelNo: '',
    serialNo: '',
    purchasePrice: '',
    rentalRate: '',
    rentalRateType: 'DAILY',
    currentOperator: '',
    currentProjectId: '',
  });

  const [usageForm, setUsageForm] = useState({
    equipmentId: '',
    projectId: '',
    logDate: new Date().toISOString().split('T')[0],
    startHours: '',
    endHours: '',
    fuelConsumedLitres: '',
    workDescription: '',
    operatorName: '',
  });

  const [maintForm, setMaintForm] = useState({
    equipmentId: '',
    maintenanceType: 'ROUTINE',
    description: '',
    cost: '',
    servicedBy: '',
    nextDueHours: '',
    nextDueDate: '',
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchEquipment();
  }, [selectedProjectId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await api.getEquipment();
      if (res.success && res.equipment) {
        setEquipmentList(res.equipment);
        if (res.equipment.length > 0 && !selectedAsset) {
          setSelectedAsset(res.equipment[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load equipment list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...addForm,
        purchasePrice: addForm.purchasePrice ? parseFloat(addForm.purchasePrice) : 0,
        rentalRate: addForm.rentalRate ? parseFloat(addForm.rentalRate) : 0,
        currentProjectId: addForm.currentProjectId || null,
      };
      await api.createEquipment(payload);
      setShowAddModal(false);
      setAddForm({
        code: '',
        name: '',
        assetType: 'OWNED',
        category: 'EARTHMOVING',
        modelNo: '',
        serialNo: '',
        purchasePrice: '',
        rentalRate: '',
        rentalRateType: 'DAILY',
        currentOperator: '',
        currentProjectId: '',
      });
      fetchEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to create equipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageForm.equipmentId) return;
    try {
      setIsSubmitting(true);
      await api.logEquipmentUsage(usageForm.equipmentId, {
        projectId: usageForm.projectId || (selectedProjectId || projects[0]?.id),
        logDate: usageForm.logDate,
        startHours: parseFloat(usageForm.startHours) || 0,
        endHours: parseFloat(usageForm.endHours) || 0,
        fuelConsumedLitres: parseFloat(usageForm.fuelConsumedLitres) || 0,
        workDescription: usageForm.workDescription,
        operatorName: usageForm.operatorName,
      });
      setShowUsageModal(false);
      fetchEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to record usage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintForm.equipmentId) return;
    try {
      setIsSubmitting(true);
      await api.recordMaintenance(maintForm.equipmentId, {
        maintenanceType: maintForm.maintenanceType,
        description: maintForm.description,
        cost: parseFloat(maintForm.cost) || 0,
        servicedBy: maintForm.servicedBy,
        nextDueHours: maintForm.nextDueHours ? parseFloat(maintForm.nextDueHours) : null,
        nextDueDate: maintForm.nextDueDate || null,
      });
      setShowMaintenanceModal(false);
      fetchEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to record maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEquipment = equipmentList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.modelNo && item.modelNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Aggregated Stats
  const totalAssets = equipmentList.length;
  const inUseCount = equipmentList.filter((e) => e.status === 'IN_USE').length;
  const underMaintCount = equipmentList.filter((e) => e.status === 'UNDER_MAINTENANCE').length;
  const totalRunHours = equipmentList.reduce((sum, e) => sum + (e.hoursRunTotal || 0), 0);
  const totalFuelLitres = equipmentList.reduce(
    (sum, e) => sum + (e.logs?.reduce((lSum, l) => lSum + (l.fuelConsumedLitres || 0), 0) || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Actions */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-60 h-60 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25 shrink-0">
              <Truck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Plant & Heavy Machinery
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider">
                  Live Telemetry
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  {totalAssets} Fleet Assets
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Heavy plant fleet tracking, digital logbooks, diesel fuel telemetry, and scheduled preventive maintenance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {hasRole('OWNER', 'SITE_ENGINEER', 'PROJECT_MANAGER') && (
              <button
                onClick={() => {
                  if (selectedAsset) {
                    setUsageForm((prev) => ({
                      ...prev,
                      equipmentId: selectedAsset.id,
                      startHours: String(selectedAsset.hoursRunTotal || 0),
                      endHours: String((selectedAsset.hoursRunTotal || 0) + 8),
                      operatorName: selectedAsset.currentOperator || '',
                    }));
                  }
                  setShowUsageModal(true);
                }}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Log Daily Hours & Fuel</span>
              </button>
            )}

            {hasRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER') && (
              <>
                <button
                  onClick={() => {
                    if (selectedAsset) {
                      setMaintForm((prev) => ({ ...prev, equipmentId: selectedAsset.id }));
                    }
                    setShowMaintenanceModal(true);
                  }}
                  className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
                >
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Record Service</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-xl shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.8]" />
                  <span>Register Asset</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Fleet Strength</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalAssets} Units</div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            <span className="text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
              {equipmentList.filter((e) => e.assetType === 'OWNED').length} Owned
            </span>
            <span>•</span>
            <span className="text-purple-700 font-bold px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200">
              {equipmentList.filter((e) => e.assetType === 'RENTED').length} Rented
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Active on Sites</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{inUseCount} Active</div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalAssets > 0 ? (inUseCount / totalAssets) * 100 : 0}%` }}
              />
            </div>
            <span className="font-mono font-bold text-emerald-700">
              {totalAssets > 0 ? ((inUseCount / totalAssets) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Cumulative Engine Hours</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatMetricNumber(totalRunHours)} Hrs</div>
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg mt-2 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>{underMaintCount} unit(s) in maintenance bay</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-orange-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Diesel Fuel Logged</span>
            <Fuel className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{formatMetricNumber(totalFuelLitres)} Ltrs</div>
          <div className="text-xs text-slate-500 mt-2">
            Avg <strong className="text-slate-800 font-semibold">{totalRunHours > 0 ? (totalFuelLitres / totalRunHours).toFixed(1) : 0} L</strong> / engine hour
          </div>
        </div>
      </div>

      {/* Main Grid: Left List / Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Asset Browser */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search machine, model, registration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-medium transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-medium cursor-pointer transition"
              >
                <option value="ALL">All Categories</option>
                <option value="EARTHMOVING">Earthmoving (JCB/Excavator)</option>
                <option value="LIFTING">Lifting & Cranes</option>
                <option value="CONCRETE">Concrete Equipment</option>
                <option value="TRANSPORT">Transit & Dumpers</option>
                <option value="POWER">Power Gensets & Compressors</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 font-medium cursor-pointer transition"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

          {/* List of Machinery Cards */}
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span>Loading machinery registry...</span>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 text-xs">
                No equipment assets matching filters.
              </div>
            ) : (
              filteredEquipment.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-bold ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {asset.code}
                          </span>
                          <span
                            className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              asset.assetType === 'OWNED'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {asset.assetType}
                          </span>
                        </div>
                        <h4
                          className={`font-bold text-sm mt-1.5 truncate ${
                            isSelected ? 'text-slate-950 font-black' : 'text-slate-900'
                          }`}
                        >
                          {asset.name}
                        </h4>
                        <div
                          className={`text-[11px] mt-0.5 truncate ${
                            isSelected ? 'text-slate-600 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {asset.category} {asset.modelNo && `• ${asset.modelNo}`}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                          asset.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : asset.status === 'IN_USE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {asset.status === 'IN_USE' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        {asset.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div
                      className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                        isSelected ? 'border-amber-200/70 text-slate-600' : 'border-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-700' : 'text-amber-500'}`} />
                        <strong className="text-slate-900 font-mono font-bold">
                          {formatMetricNumber(asset.hoursRunTotal || 0)}
                        </strong>{' '}
                        hrs logged
                      </span>
                      <span className="truncate max-w-[150px]">
                        Operator:{' '}
                        <strong className={isSelected ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold'}>
                          {asset.currentOperator || 'Unassigned'}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Asset Command Hub */}
        <div className="lg:col-span-7">
          {selectedAsset ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 sm:p-6 space-y-6">
              {/* Asset Hero Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">{selectedAsset.name}</h2>
                    <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                      {selectedAsset.code}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                        selectedAsset.assetType === 'OWNED'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {selectedAsset.assetType}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-3.5 flex-wrap">
                    <span>Category: <strong className="text-slate-800 font-semibold">{selectedAsset.category}</strong></span>
                    <span>Serial No: <strong className="text-slate-800 font-mono font-semibold">{selectedAsset.serialNo || 'N/A'}</strong></span>
                    <span>Model: <strong className="text-slate-800 font-semibold">{selectedAsset.modelNo || 'N/A'}</strong></span>
                  </div>
                </div>

                <div className="sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200/80 shrink-0">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Commercial Rate / Valuation</div>
                  <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                    {selectedAsset.assetType === 'OWNED'
                      ? formatCurrency(selectedAsset.purchasePrice || 0)
                      : `${formatCurrency(selectedAsset.rentalRate || 0)} / ${selectedAsset.rentalRateType?.toLowerCase()}`}
                  </div>
                </div>
              </div>

              {/* 4 Telemetry Quick Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Run Meter</span>
                  <div className="text-base font-black text-slate-900 mt-1 font-mono">
                    {formatMetricNumber(selectedAsset.hoursRunTotal || 0)} Hrs
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">Operational</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Fuel Logged</span>
                  <div className="text-base font-black text-amber-700 mt-1 font-mono">
                    {formatMetricNumber(selectedAsset.logs?.reduce((sum, l) => sum + (l.fuelConsumedLitres || 0), 0) || 0)} L
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">Diesel telemetry</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Assigned Operator</span>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {selectedAsset.currentOperator || 'Unassigned'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">Designated driver</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Site Location</span>
                  <div className="text-xs font-bold text-amber-700 mt-1 truncate">
                    {selectedAsset.logs?.[0]?.project?.name || (projects.find((p) => p.id === selectedAsset.currentProjectId)?.name || 'Central Yard')}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">Current deployment</div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setAssetDetailTab('telemetry')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      assetDetailTab === 'telemetry'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    Site Logbook ({selectedAsset.logs?.length || 0})
                  </button>
                  <button
                    onClick={() => setAssetDetailTab('maintenance')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      assetDetailTab === 'maintenance'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    Maintenance ({selectedAsset.maintenances?.length || 0})
                  </button>
                  <button
                    onClick={() => setAssetDetailTab('specs')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      assetDetailTab === 'specs'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    Tech Specs
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setUsageForm((prev) => ({
                        ...prev,
                        equipmentId: selectedAsset.id,
                        startHours: String(selectedAsset.hoursRunTotal || 0),
                        endHours: String((selectedAsset.hoursRunTotal || 0) + 8),
                        operatorName: selectedAsset.currentOperator || '',
                      }));
                      setShowUsageModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span>+ Log Hours & Fuel</span>
                  </button>
                  <button
                    onClick={() => {
                      setMaintForm((prev) => ({ ...prev, equipmentId: selectedAsset.id }));
                      setShowMaintenanceModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-950 stroke-[2.4]" />
                    <span>+ Record Service</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Site Logbook & Fuel Telemetry */}
              {assetDetailTab === 'telemetry' && (
                <div className="space-y-3">
                  {selectedAsset.logs && selectedAsset.logs.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Project Site</th>
                            <th className="py-2.5 px-3">Meter Range</th>
                            <th className="py-2.5 px-3">Run Time</th>
                            <th className="py-2.5 px-3">Fuel Consumed</th>
                            <th className="py-2.5 px-3">Operator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedAsset.logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                {new Date(log.logDate).toLocaleDateString('en-IN')}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {log.project?.name || 'Active Site'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                {log.startHours} → {log.endHours} hrs
                              </td>
                              <td className="py-2.5 px-3 font-black text-emerald-600 font-mono">
                                {log.hoursWorked} hrs
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                                {log.fuelConsumedLitres} L
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">
                                {log.operatorName || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                      <Clock className="w-8 h-8 text-slate-400 mb-2" />
                      <div className="font-bold text-slate-800 text-sm">No telemetry run hours recorded yet</div>
                      <p className="text-slate-500 text-xs mt-1 max-w-xs">
                        Keep machinery metrics fresh by logging daily running hours and diesel consumption.
                      </p>
                      <button
                        onClick={() => {
                          setUsageForm((prev) => ({
                            ...prev,
                            equipmentId: selectedAsset.id,
                            startHours: String(selectedAsset.hoursRunTotal || 0),
                            endHours: String((selectedAsset.hoursRunTotal || 0) + 8),
                            operatorName: selectedAsset.currentOperator || '',
                          }));
                          setShowUsageModal(true);
                        }}
                        className="mt-3 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs shadow-sm transition"
                      >
                        + Log First Run Hours
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Maintenance History */}
              {assetDetailTab === 'maintenance' && (
                <div className="space-y-3">
                  {selectedAsset.maintenances && selectedAsset.maintenances.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedAsset.maintenances.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{m.maintenanceType}</span>
                              <span className="text-slate-500 text-[11px]">• {new Date(m.maintenanceDate).toLocaleDateString('en-IN')}</span>
                              {m.servicedBy && <span className="text-amber-700 font-semibold">by {m.servicedBy}</span>}
                            </div>
                            <p className="text-slate-600 text-xs mt-1">{m.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-emerald-700 font-mono text-sm">{formatCurrency(m.cost)}</div>
                            {m.nextDueHours && (
                              <div className="text-[10px] text-slate-500 mt-0.5">Next due at: {m.nextDueHours} hrs</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                      <Wrench className="w-8 h-8 text-slate-400 mb-2" />
                      <div className="font-bold text-slate-800 text-sm">No maintenance records logged</div>
                      <p className="text-slate-500 text-xs mt-1 max-w-xs">
                        Record routine oil changes, filter replacements, hydraulic servicing, and major overhauls.
                      </p>
                      <button
                        onClick={() => {
                          setMaintForm((prev) => ({ ...prev, equipmentId: selectedAsset.id }));
                          setShowMaintenanceModal(true);
                        }}
                        className="mt-3 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs shadow-sm transition"
                      >
                        + Record Service Event
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 3: Technical Specifications */}
              {assetDetailTab === 'specs' && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Asset Identifier</span>
                      <span className="text-slate-900 font-mono font-bold mt-0.5 block">{selectedAsset.code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Category</span>
                      <span className="text-slate-900 font-semibold mt-0.5 block">{selectedAsset.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Model / Make</span>
                      <span className="text-slate-900 font-semibold mt-0.5 block">{selectedAsset.modelNo || 'Standard OEM'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Serial / Chassis Number</span>
                      <span className="text-slate-900 font-mono font-semibold mt-0.5 block">{selectedAsset.serialNo || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Procurement Model</span>
                      <span className="text-slate-900 font-semibold mt-0.5 block">{selectedAsset.assetType === 'OWNED' ? 'Company Owned Asset' : 'Subcontractor / Hired Machinery'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Commercial Valuation</span>
                      <span className="text-emerald-700 font-mono font-bold mt-0.5 block">
                        {selectedAsset.assetType === 'OWNED'
                          ? formatCurrency(selectedAsset.purchasePrice || 0)
                          : `${formatCurrency(selectedAsset.rentalRate || 0)} / ${selectedAsset.rentalRateType?.toLowerCase()}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs shadow-sm">
              <Truck className="w-12 h-12 text-slate-400 mb-3" />
              <div className="font-bold text-slate-800 text-sm">Select an equipment asset</div>
              <p className="text-slate-500 mt-1 max-w-sm text-center">
                Choose any plant machinery from the left to view real-time engine telemetry, site fuel logs, and service history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Register New Machinery */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                Register Construction Asset
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEquipment} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Asset Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EQ-EXC-002"
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Asset Type</label>
                  <select
                    value={addForm.assetType}
                    onChange={(e) => setAddForm({ ...addForm, assetType: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="OWNED">Company Owned</option>
                    <option value="RENTED">Hired / Rented</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Machine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JCB 3DX Backhoe Loader"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Category *</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="EARTHMOVING">Earthmoving</option>
                    <option value="LIFTING">Lifting & Cranes</option>
                    <option value="CONCRETE">Concrete Equipment</option>
                    <option value="TRANSPORT">Transit & Dumpers</option>
                    <option value="POWER">Power Gensets</option>
                    <option value="FABRICATION">Fabrication</option>
                    <option value="OTHER">Other Assets</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Model / Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. 2023 Heavy Duty"
                    value={addForm.modelNo}
                    onChange={(e) => setAddForm({ ...addForm, modelNo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {addForm.assetType === 'OWNED' ? (
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 3850000"
                      value={addForm.purchasePrice}
                      onChange={(e) => setAddForm({ ...addForm, purchasePrice: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Hire / Rental Rate (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 4500"
                      value={addForm.rentalRate}
                      onChange={(e) => setAddForm({ ...addForm, rentalRate: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Assigned Operator</label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Kumar"
                    value={addForm.currentOperator}
                    onChange={(e) => setAddForm({ ...addForm, currentOperator: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Deploy to Project</label>
                <SearchableSelect
                  value={addForm.currentProjectId}
                  onChange={(val) => setAddForm({ ...addForm, currentProjectId: val })}
                  options={[
                    { value: '', label: 'Base Equipment Yard / Central Depot' },
                    ...projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                      code: p.code,
                    })),
                  ]}
                  placeholder="Base Equipment Yard / Central Depot"
                  searchPlaceholder="Search project..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Daily Usage & Fuel */}
      {showUsageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Log Daily Usage & Fuel
              </h3>
              <button onClick={() => setShowUsageModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleLogUsage} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Equipment Unit *</label>
                <SearchableSelect
                  value={usageForm.equipmentId}
                  onChange={(val) => {
                    const eq = equipmentList.find((x) => x.id === val);
                    setUsageForm({
                      ...usageForm,
                      equipmentId: val,
                      startHours: String(eq?.hoursRunTotal || 0),
                      endHours: String((eq?.hoursRunTotal || 0) + 8),
                      operatorName: eq?.currentOperator || '',
                    });
                  }}
                  options={equipmentList.map((eq) => ({
                    value: eq.id,
                    label: eq.name,
                    code: eq.code,
                    sublabel: `Current: ${eq.hoursRunTotal || 0} hrs`,
                  }))}
                  placeholder="Select Equipment"
                  searchPlaceholder="Search machine by name or code..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={usageForm.logDate}
                    onChange={(e) => setUsageForm({ ...usageForm, logDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Project Site</label>
                  <SearchableSelect
                    value={usageForm.projectId}
                    onChange={(val) => setUsageForm({ ...usageForm, projectId: val })}
                    options={projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                      code: p.code,
                    }))}
                    placeholder="Select Project Site"
                    searchPlaceholder="Search project..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Start Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={usageForm.startHours}
                    onChange={(e) => setUsageForm({ ...usageForm, startHours: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">End Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={usageForm.endHours}
                    onChange={(e) => setUsageForm({ ...usageForm, endHours: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Fuel (Ltr)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="Diesel"
                    value={usageForm.fuelConsumedLitres}
                    onChange={(e) => setUsageForm({ ...usageForm, fuelConsumedLitres: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Operator Name</label>
                <input
                  type="text"
                  value={usageForm.operatorName}
                  onChange={(e) => setUsageForm({ ...usageForm, operatorName: e.target.value })}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Work Description</label>
                <textarea
                  rows={2}
                  value={usageForm.workDescription}
                  onChange={(e) => setUsageForm({ ...usageForm, workDescription: e.target.value })}
                  placeholder="e.g. Foundation earth excavation grid A to D"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Record Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Record Service / Maintenance */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                Record Maintenance / Service
              </h3>
              <button onClick={() => setShowMaintenanceModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordMaintenance} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Equipment Unit *</label>
                <SearchableSelect
                  value={maintForm.equipmentId}
                  onChange={(val) => setMaintForm({ ...maintForm, equipmentId: val })}
                  options={equipmentList.map((eq) => ({
                    value: eq.id,
                    label: eq.name,
                    code: eq.code,
                  }))}
                  placeholder="Select Equipment"
                  searchPlaceholder="Search machine by name or code..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Maintenance Type</label>
                  <select
                    value={maintForm.maintenanceType}
                    onChange={(e) => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ROUTINE">Routine Service (Oil/Filters)</option>
                    <option value="BREAKDOWN">Breakdown Repair</option>
                    <option value="OVERHAUL">Major Engine Overhaul</option>
                    <option value="INSPECTION">Safety & RTO Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Total Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 18500"
                    value={maintForm.cost}
                    onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Serviced By / Agency</label>
                <input
                  type="text"
                  placeholder="e.g. JCB Authorized Service Centre"
                  value={maintForm.servicedBy}
                  onChange={(e) => setMaintForm({ ...maintForm, servicedBy: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Description / Parts Replaced *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Engine oil change 15W40, hydraulic filter replacement, grease pack"
                  value={maintForm.description}
                  onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Next Service Due (Hrs)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={maintForm.nextDueHours}
                    onChange={(e) => setMaintForm({ ...maintForm, nextDueHours: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Next Due Date</label>
                  <input
                    type="date"
                    value={maintForm.nextDueDate}
                    onChange={(e) => setMaintForm({ ...maintForm, nextDueDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Save Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipment;
