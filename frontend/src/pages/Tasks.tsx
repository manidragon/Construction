import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Task, BOQItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  CheckSquare,
  Plus,
  Clock,
  MessageSquare,
  Send,
  X,
  LayoutGrid,
  List,
  Eye,
  Edit2,
  Trash2,
  Palette,
  Image as ImageIcon,
  ExternalLink,
  FileText,
  Sparkles,
  Layers,
  Zap,
} from 'lucide-react';
import DynamicSelect from '../components/common/DynamicSelect';

export const Tasks: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId, refreshProjects } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectBOQItems, setProjectBOQItems] = useState<BOQItem[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState('');

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    projectId: '',
    boqItemId: '',
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    priority: 'MEDIUM',
    plannedQty: '100',
    unit: 'SQFT',
    estimatedCost: '8000',
    materialSwatchUrl: '',
    designRenderUrl: '',
    clientSignOffDoc: '',
    clientApprovalStatus: 'APPROVED',
    isScopeVariation: false,
  });

  // Edit / Delete Task States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<any>({
    title: '',
    description: '',
    boqItemId: '',
    startDate: '',
    dueDate: '',
    priority: 'MEDIUM',
    plannedQty: '100',
    completedQty: '0',
    unit: 'SQFT',
    estimatedCost: '0',
    actualCost: '0',
    status: 'NOT_STARTED',
    materialSwatchUrl: '',
    designRenderUrl: '',
    clientSignOffDoc: '',
    clientApprovalStatus: 'APPROVED',
    isScopeVariation: false,
  });

  const [currentProject, setCurrentProject] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [standardToast, setStandardToast] = useState<{
    message: string;
    whatsappStatus?: string;
    entity: string;
    success: boolean;
  } | null>(null);

  // Quick-Add Task Form State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('MEDIUM');
  const [quickStatus, setQuickStatus] = useState('NOT_STARTED');
  const [quickAssignedTo, setQuickAssignedTo] = useState('');
  const [quickDueDate, setQuickDueDate] = useState(
    new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [quickAdding, setQuickAdding] = useState(false);

  useEffect(() => {
    setProjectId(selectedProjectId || '');
  }, [selectedProjectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.getTasks(projectId ? `projectId=${projectId}` : '');
      if (res.success) {
        setTasks(res.tasks || []);
        if (selectedTask) {
          const updated = (res.tasks || []).find((t: any) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (projId: string) => {
    try {
      const res = await api.getProjectById(projId);
      if (res.success) {
        setCurrentProject(res.project);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchTasks();
    const curProj = projectId || selectedProjectId;
    if (curProj) {
      loadProjectDetails(curProj);
      api.getBOQ(curProj).then((res) => {
        if (res.success) setProjectBOQItems(res.items || []);
      }).catch(() => {});
    }
    // Load users for assignment
    api.getUsers().then((res) => {
      if (res.success && res.users) {
        setUsersList(res.users);
      }
    }).catch(() => {});
  }, [projectId, selectedProjectId]);

  const handleConfirmAdvancePayment = async () => {
    if (!currentProject) return;
    try {
      const res = await api.confirmProjectAdvance(currentProject.id, {
        notes: 'Advance confirmed from Tasks screen by Finance officer',
      });
      if (res.success) {
        alert('Advance payment confirmed by Finance! Project execution schedule and task creation unlocked.');
        await loadProjectDetails(currentProject.id);
        await refreshProjects();
      }
    } catch (err: any) {
      alert(`Error confirming advance: ${err.message}`);
    }
  };

  const handleSelectBOQItem = (boqId: string) => {
    const boq = projectBOQItems.find((b) => b.id === boqId);
    if (boq) {
      setTaskForm((prev) => ({
        ...prev,
        boqItemId: boqId,
        title: prev.title || `${boq.category.replace(/_/g, ' ')}: ${boq.description.slice(0, 45)}`,
        description: prev.description || boq.description,
        plannedQty: String(boq.estimatedQty),
        unit: boq.unit,
        estimatedCost: String(boq.estimatedTotal),
        materialSwatchUrl: boq.materialSwatchUrl || prev.materialSwatchUrl,
        designRenderUrl: boq.designRenderUrl || prev.designRenderUrl,
        clientApprovalStatus: boq.clientApprovalStatus || 'APPROVED',
        clientSignOffDoc: boq.clientSignOffDoc || prev.clientSignOffDoc,
      }));
    } else {
      setTaskForm((prev) => ({ ...prev, boqItemId: '' }));
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await api.updateLifecycleStatus({
        entityType: 'Task',
        entityId: taskId,
        toStatus: newStatus,
      });
      if (res.success) {
        setStandardToast({
          message: res.message,
          whatsappStatus: res.whatsappStatus,
          entity: res.entity || 'Task',
          success: true,
        });
        fetchTasks();
        refreshProjects();
        setTimeout(() => setStandardToast(null), 5000);
      }
    } catch (err: any) {
      setStandardToast({
        message: err.message || 'Failed to update status',
        entity: 'Task',
        success: false,
      });
    }
  };

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    try {
      setQuickAdding(true);
      const targetProjId = projectId || selectedProjectId || (projects[0]?.id || '');
      const res = await api.quickAddTask({
        title: quickTitle.trim(),
        projectId: targetProjId,
        assignedToId: quickAssignedTo || undefined,
        priority: quickPriority,
        status: quickStatus,
        dueDate: quickDueDate,
      });
      if (res.success) {
        setStandardToast({
          message: res.message,
          whatsappStatus: res.whatsappStatus,
          entity: res.entity || 'Task',
          success: true,
        });
        setQuickTitle('');
        fetchTasks();
        refreshProjects();
        setTimeout(() => setStandardToast(null), 5000);
      } else {
        alert(res.message || 'Failed to quick-add task');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to quick-add task');
    } finally {
      setQuickAdding(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText.trim()) return;
    try {
      const res = await api.addTaskComment(selectedTask.id, commentText);
      if (res.success) {
        setCommentText('');
        fetchTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetProjId = taskForm.projectId || projectId || selectedProjectId || (projects[0]?.id || '');
      const res = await api.createTask({ ...taskForm, projectId: targetProjId });
      if (res.success) {
        setShowCreateModal(false);
        fetchTasks();
        refreshProjects();
        setTaskForm({
          projectId: '',
          boqItemId: '',
          title: '',
          description: '',
          startDate: '',
          dueDate: '',
          priority: 'MEDIUM',
          plannedQty: '100',
          unit: 'SQFT',
          estimatedCost: '50000',
          materialSwatchUrl: '',
          designRenderUrl: '',
          clientSignOffDoc: '',
          clientApprovalStatus: 'APPROVED',
          isScopeVariation: false,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      boqItemId: task.boqItemId || '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      priority: task.priority || 'MEDIUM',
      plannedQty: String(task.plannedQty || 0),
      completedQty: String(task.completedQty || 0),
      unit: task.unit || 'SQFT',
      estimatedCost: String(task.estimatedCost || 0),
      actualCost: String(task.actualCost || 0),
      status: task.status || 'NOT_STARTED',
      materialSwatchUrl: task.materialSwatchUrl || '',
      designRenderUrl: task.designRenderUrl || '',
      clientSignOffDoc: task.clientSignOffDoc || '',
      clientApprovalStatus: task.clientApprovalStatus || 'APPROVED',
      isScopeVariation: Boolean(task.isScopeVariation),
    });
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      const res = await api.updateTask(editingTask.id, editTaskForm);
      if (res.success) {
        setEditingTask(null);
        fetchTasks();
        refreshProjects();
        if (selectedTask?.id === editingTask.id) {
          setSelectedTask(res.task);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      const res = await api.deleteTask(deletingTask.id);
      if (res.success) {
        if (selectedTask?.id === deletingTask.id) {
          setSelectedTask(null);
        }
        setDeletingTask(null);
        fetchTasks();
        refreshProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const columns = [
    { id: 'NOT_STARTED', title: 'Not Started', color: 'border-slate-300' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-amber-400' },
    { id: 'PENDING_APPROVAL', title: 'Pending Approval', color: 'border-blue-400' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Daily Tasks & Milestone Execution
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kanban workflow, quantity progress tracking, priority escalations, and site coordination.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'kanban' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {hasRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* MODULE 3: Project Kickoff Gate Warning Banner */}
      {currentProject && currentProject.advancePaymentConfirmed === false && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 text-sm">
              ⚠️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                  Module 3 Kickoff Gate: Execution Schedules & Site Tasks Locked
                </h3>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Pending Finance Confirmation
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                Initial advance booking payment of ₹<strong>{currentProject.advancePaymentRequired?.toLocaleString('en-IN') || '0'}</strong> for project "{currentProject.name}" has not yet been confirmed by the Finance Department. Site task scheduling and assignments remain locked.
              </p>
            </div>
          </div>
          {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
            <button
              onClick={handleConfirmAdvancePayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shrink-0 transition"
            >
              <span>Confirm Advance & Unlock Kickoff</span>
            </button>
          )}
        </div>
      )}

      {/* Standardized Toast Banner */}
      {standardToast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-sm animate-in fade-in ${
            standardToast.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{standardToast.success ? '✅' : '⚠️'}</span>
            <span>{standardToast.message}</span>
            {standardToast.whatsappStatus && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                  standardToast.whatsappStatus === 'Dispatched'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                WhatsApp: {standardToast.whatsappStatus}
              </span>
            )}
          </div>
          <button
            onClick={() => setStandardToast(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Operational Quick-Add Task Bar */}
      {hasRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER') && (
        <form
          onSubmit={handleQuickAddTask}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3"
        >
          <div className="flex items-center gap-2 shrink-0 text-amber-500 font-bold text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4 fill-amber-500" />
            <span>Quick Task:</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              required
              placeholder="Task Title (e.g. Living room electrical wiring & conduit laying...)"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="w-full md:w-44 shrink-0">
            <select
              value={quickAssignedTo}
              onChange={(e) => setQuickAssignedTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Assigned Staff...</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role?.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-36 shrink-0">
            <DynamicSelect
              category="TaskPriority"
              value={quickPriority}
              onChange={setQuickPriority}
              placeholder="Priority..."
              className="!bg-slate-50 !border-slate-300 !text-slate-800 !py-2 !text-xs !rounded-xl"
            />
          </div>

          <div className="w-full md:w-36 shrink-0">
            <input
              type="date"
              value={quickDueDate}
              onChange={(e) => setQuickDueDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="w-full md:w-36 shrink-0">
            <DynamicSelect
              category="TaskStatus"
              value={quickStatus}
              onChange={setQuickStatus}
              placeholder="Status..."
              className="!bg-slate-50 !border-slate-300 !text-slate-800 !py-2 !text-xs !rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={quickAdding || !quickTitle.trim()}
            className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{quickAdding ? 'Adding...' : 'Add Task'}</span>
          </button>
        </form>
      )}

      {/* Project Selector Bar */}
      <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
        <label className="text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">Filter Project:</label>
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setSelectedProjectId(e.target.value);
          }}
          className="text-xs sm:text-sm bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm min-w-[280px] sm:min-w-[340px] md:min-w-[400px] cursor-pointer transition"
        >
          <option value="">🌐 All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col min-h-[500px]">
                <div className={`flex items-center justify-between pb-3 border-b-2 ${col.color}`}>
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">{col.title}</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 mt-3 flex-1 overflow-y-auto custom-scrollbar">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                            task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {task.priority}
                          </span>
                          {task.boqItem && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title={`Linked BOQ: ${task.boqItem.description}`}>
                              BOQ: {task.boqItem.itemCode}
                            </span>
                          )}
                          {task.isScopeVariation && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              Variation
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center">
                          <Clock className="w-3 h-3 mr-0.5" />
                          {formatDate(task.dueDate)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition flex items-center justify-between">
                        <span>{task.title}</span>
                        <div className="flex items-center space-x-1 shrink-0 ml-1">
                          {task.materialSwatchUrl && (
                            <span className="p-0.5 rounded bg-amber-50 text-amber-700" title="Material Swatch attached">
                              <Palette className="w-3 h-3" />
                            </span>
                          )}
                          {task.designRenderUrl && (
                            <span className="p-0.5 rounded bg-blue-50 text-blue-700" title="3D Render attached">
                              <ImageIcon className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </h4>

                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                      )}

                      {/* Progress bar */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Qty Completed</span>
                          <span className="font-mono font-bold text-slate-800">{task.completedQty} / {task.plannedQty} {task.unit}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, task.plannedQty > 0 ? (task.completedQty / task.plannedQty) * 100 : 0)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Status Dropdown & Actions */}
                      <div className="pt-2 flex items-center justify-between">
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-700 cursor-pointer hover:border-amber-400"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="PENDING_APPROVAL">Pending Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="DELAYED">Delayed</option>
                          <option value="ON_HOLD">On Hold</option>
                        </select>

                        <div className="flex items-center space-x-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="View Task Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditTask(task)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingTask(task)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
              <tr>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Assigned To</th>
                <th className="py-3 px-3">Start Date</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-right">Quantity Completed</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tasks.map((task) => (
                <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="py-3 px-3 font-bold text-slate-900">{task.title}</td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{task.assignedUser?.name || 'Engineer'}</td>
                  <td className="py-3 px-3 text-slate-500">{formatDate(task.startDate)}</td>
                  <td className="py-3 px-3 text-slate-500">{formatDate(task.dueDate)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                    {task.completedQty} / {task.plannedQty} {task.unit}
                  </td>
                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : task.status === 'DELAYED'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="PENDING_APPROVAL">Pending Review</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DELAYED">Delayed</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View Task Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditTask(task)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Edit Task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTask(task)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail & Comments Drawer / Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  {selectedTask.priority} Priority Task
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p>{selectedTask.description || 'No description provided.'}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                <span>Start: {formatDate(selectedTask.startDate)}</span>
                <span>Due: {formatDate(selectedTask.dueDate)}</span>
                <span>Progress: {selectedTask.completedQty} / {selectedTask.plannedQty} {selectedTask.unit}</span>
                <span>Estimated Cost: {formatCurrency(selectedTask.estimatedCost)}</span>
              </div>
            </div>

            {/* Linked BOQ Item & Interior Attachments */}
            {(selectedTask.boqItem || selectedTask.materialSwatchUrl || selectedTask.designRenderUrl || selectedTask.clientSignOffDoc || selectedTask.isScopeVariation) && (
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs space-y-2">
                {selectedTask.boqItem && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/40">
                    <span className="text-slate-500 font-semibold">Linked BOQ Item:</span>
                    <strong className="text-slate-900 font-mono">[{selectedTask.boqItem.itemCode}] {selectedTask.boqItem.description}</strong>
                  </div>
                )}
                {selectedTask.isScopeVariation && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Classification:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">Client Scope Variation Task</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {selectedTask.materialSwatchUrl && (
                    <a
                      href={selectedTask.materialSwatchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-amber-700 font-bold hover:underline"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Material Swatch</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  {selectedTask.designRenderUrl && (
                    <a
                      href={selectedTask.designRenderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-700 font-bold hover:underline"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>3D Render</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  {selectedTask.clientSignOffDoc && (
                    <span className="text-slate-600">
                      Sign-off Record: <strong className="font-mono text-slate-800">{selectedTask.clientSignOffDoc}</strong>
                    </span>
                  )}
                  {selectedTask.clientApprovalStatus && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      Status: {selectedTask.clientApprovalStatus}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Comments thread */}
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 mb-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Site Coordination Comments ({selectedTask.comments?.length || 0})</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                {(selectedTask.comments || []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-2">No comments yet. Start a discussion below.</p>
                ) : (
                  (selectedTask.comments || []).map((c: any) => (
                    <div key={c.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <strong className="text-slate-700">{c.user?.name} ({c.user?.role})</strong>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-slate-800">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="mt-3 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Add an update or site note..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow-sm transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const t = selectedTask;
                  setSelectedTask(null);
                  setDeletingTask(t);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const t = selectedTask;
                    openEditTask(t);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Task</span>
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Site Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project *</label>
                <select
                  required
                  value={taskForm.projectId || projectId || selectedProjectId || ''}
                  onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link to Approved BOQ Item (Optional)</label>
                <select
                  value={taskForm.boqItemId}
                  onChange={(e) => handleSelectBOQItem(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="">-- No BOQ Item Linked --</option>
                  {projectBOQItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.itemCode}] {b.category.replace(/_/g, ' ')} - {b.description.slice(0, 45)} ({b.estimatedQty} {b.unit})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">Selecting a BOQ item auto-populates title, quantity, budget, and design renders</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. False Ceiling Gypsum Grid Installation"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope, specifications, installation checklist..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={taskForm.startDate}
                    onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Planned Qty</label>
                  <input
                    type="number"
                    value={taskForm.plannedQty}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedQty: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UOM</label>
                  <input
                    type="text"
                    value={taskForm.unit}
                    onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Interior Design & Client Sign-Off Attachments */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2">
                <span className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5 text-amber-700" />
                  <span>Interior Design & Client Sign-Off Attachments</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">Material Swatch URL</label>
                    <input
                      type="url"
                      placeholder="https://... swatch link"
                      value={taskForm.materialSwatchUrl}
                      onChange={(e) => setTaskForm({ ...taskForm, materialSwatchUrl: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">3D Render URL</label>
                    <input
                      type="url"
                      placeholder="https://... 3D render link"
                      value={taskForm.designRenderUrl}
                      onChange={(e) => setTaskForm({ ...taskForm, designRenderUrl: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">Approval Status</label>
                    <select
                      value={taskForm.clientApprovalStatus}
                      onChange={(e) => setTaskForm({ ...taskForm, clientApprovalStatus: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    >
                      <option value="APPROVED">APPROVED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="VARIATION_REQUESTED">VARIATION REQUESTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">Client Sign-Off Record</label>
                    <input
                      type="text"
                      placeholder="Doc Ref / Email link"
                      value={taskForm.clientSignOffDoc}
                      onChange={(e) => setTaskForm({ ...taskForm, clientSignOffDoc: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="isScopeVariation"
                    checked={taskForm.isScopeVariation}
                    onChange={(e) => setTaskForm({ ...taskForm, isScopeVariation: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <label htmlFor="isScopeVariation" className="text-xs font-semibold text-slate-700">
                    Mark as Client Scope Variation Task
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-8 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Edit Site Task & Progress</h3>
              <button onClick={() => setEditingTask(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateTask} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTaskForm.title}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editTaskForm.description}
                  onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editTaskForm.status}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, status: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING_APPROVAL">Pending Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editTaskForm.priority}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, priority: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editTaskForm.startDate}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, startDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editTaskForm.dueDate}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, dueDate: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Planned Qty</label>
                  <input
                    type="number"
                    value={editTaskForm.plannedQty}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, plannedQty: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Completed Qty</label>
                  <input
                    type="number"
                    value={editTaskForm.completedQty}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, completedQty: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">UOM</label>
                  <input
                    type="text"
                    value={editTaskForm.unit}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, unit: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={editTaskForm.estimatedCost}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, estimatedCost: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Actual Cost (₹)</label>
                  <input
                    type="number"
                    value={editTaskForm.actualCost}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, actualCost: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Interior Design & Client Sign-Off Attachments */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-2">
                <span className="text-[11px] font-bold text-amber-900 flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5 text-amber-700" />
                  <span>Interior Design & Client Sign-Off Attachments</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">Material Swatch URL</label>
                    <input
                      type="url"
                      placeholder="https://... swatch link"
                      value={editTaskForm.materialSwatchUrl}
                      onChange={(e) => setEditTaskForm({ ...editTaskForm, materialSwatchUrl: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">3D Render URL</label>
                    <input
                      type="url"
                      placeholder="https://... 3D render link"
                      value={editTaskForm.designRenderUrl}
                      onChange={(e) => setEditTaskForm({ ...editTaskForm, designRenderUrl: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">Approval Status</label>
                    <select
                      value={editTaskForm.clientApprovalStatus}
                      onChange={(e) => setEditTaskForm({ ...editTaskForm, clientApprovalStatus: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    >
                      <option value="APPROVED">APPROVED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="VARIATION_REQUESTED">VARIATION REQUESTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">Client Sign-Off Record</label>
                    <input
                      type="text"
                      placeholder="Doc Ref / Email link"
                      value={editTaskForm.clientSignOffDoc}
                      onChange={(e) => setEditTaskForm({ ...editTaskForm, clientSignOffDoc: e.target.value })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="editIsScopeVariation"
                    checked={editTaskForm.isScopeVariation}
                    onChange={(e) => setEditTaskForm({ ...editTaskForm, isScopeVariation: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  <label htmlFor="editIsScopeVariation" className="text-xs font-semibold text-slate-700">
                    Mark as Client Scope Variation Task
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Modal */}
      {deletingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Task?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete task <strong className="text-slate-800">{deletingTask.title}</strong>? All task comments will also be permanently deleted.
              </p>
            </div>
            <div className="flex justify-center space-x-2 pt-2">
              <button
                onClick={() => setDeletingTask(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition"
              >
                Yes, Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
