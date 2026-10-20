import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { Task } from '../types';
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
} from 'lucide-react';

export const Tasks: React.FC = () => {
  const { hasRole } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [projectId, setProjectId] = useState<string>(selectedProjectId || (projects[0]?.id || ''));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState('');

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    projectId: '',
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    priority: 'MEDIUM',
    plannedQty: '100',
    unit: 'SQMT',
    estimatedCost: '50000',
  });

  useEffect(() => {
    if (selectedProjectId) setProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const fetchTasks = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getTasks(`projectId=${projectId}`);
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

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await api.updateTask(taskId, { status: newStatus });
      if (res.success) {
        fetchTasks();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
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
      const res = await api.createTask({ ...taskForm, projectId });
      if (res.success) {
        setShowCreateModal(false);
        fetchTasks();
        setTaskForm({
          projectId: '',
          title: '',
          description: '',
          startDate: '',
          dueDate: '',
          priority: 'MEDIUM',
          plannedQty: '100',
          unit: 'SQMT',
          estimatedCost: '50000',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
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

      {/* Project Selector Bar */}
      <div className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
        <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Project:</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 focus:outline-none"
        >
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
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                          task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center">
                          <Clock className="w-3 h-3 mr-0.5" />
                          {formatDate(task.dueDate)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition">
                        {task.title}
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

                      {/* Status Dropdown */}
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Assigned: {task.assignedUser?.name || 'Engineer'}</span>
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-700"
                        >
                          <option value="NOT_STARTED">Not Started</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="PENDING_APPROVAL">Pending Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
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
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      task.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {task.status}
                    </span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8th Floor Column Concreting"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Scope, structural location, inspection checkpoints..."
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
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
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
    </div>
  );
};
