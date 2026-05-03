import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Mail, 
  Plus, 
  X,
  Search,
  Check,
  MoreVertical
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../services/dataService';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { useProjectSettingsStore } from '../../store/projectSettingsStore';


export function ProjectSettings() {
  const { user, selectedProjectId } = useAuthStore();
  const [projectData, setProjectData] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedProjectId) return;
    const unsub = onSnapshot(doc(db, 'workspaces', selectedProjectId), (doc) => {
      if (doc.exists()) {
        setProjectData(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workspaces/${selectedProjectId}`);
    });

    return () => unsub();
  }, [selectedProjectId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setLoading(true);
    try {
      const projectRef = doc(db, 'workspaces', selectedProjectId!);
      await updateDoc(projectRef, {
        memberships: arrayUnion({
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          invitedAt: new Date().toISOString(),
          status: 'pending'
        })
      });
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!projectData) return;
    if (confirm(`Remove access for ${email}?`)) {
      const member = projectData.memberships.find((m: any) => m.email === email);
      if (member && selectedProjectId) {
        await updateDoc(doc(db, 'workspaces', selectedProjectId), {
          memberships: arrayRemove(member)
        });
      }
    }
  };

  const { settings: projSettings, setSettings: setProjSettings } = useProjectSettingsStore();

  if (!projectData) return null;

  const isOwner = projectData.ownerId === user?.id;

  return (
    <div className="max-w-4xl mx-auto py-8 px-8" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Project Members</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Manage who has access to this workspace and their permission levels.</p>
        </div>
        {(isOwner || projectData.memberships?.find((m: any) => m.email === user?.email)?.role === 'admin') && (
          <button 
            onClick={() => setShowInviteModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Share Access
          </button>
        )}
      </div>

      <div className="rounded-2xl shadow-sm overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <table className="w-full text-left">
          <thead className="border-b" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Member</th>
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Role</th>
              <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Status</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {/* Owner Row */}
            <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-sm ring-2 ring-white dark:ring-neutral-800">
                    {projectData.ownerEmail?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{projectData.ownerEmail}</p>
                    <p className="text-[10px] text-neutral-400 font-medium">Workspace Owner</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="px-2.5 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-wider rounded-full">Owner</span>
              </td>
              <td className="px-6 py-4">
                <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                  <Check className="w-3 h-3" /> Active
                </span>
              </td>
              <td className="px-6 py-4 text-right"></td>
            </tr>

            {/* Invited Members */}
            {projectData.memberships?.map((member: any, i: number) => (
              <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-400 text-sm ring-2 ring-white dark:ring-neutral-800">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">{member.email}</p>
                      <p className="text-[10px] text-neutral-400 font-medium italic">Shared Workspace Access</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    member.role === 'admin' ? "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  )}>
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                    member.status === 'active' ? "text-emerald-600" : "text-amber-500"
                  )}>
                    {member.status === 'active' ? <Check className="w-3 h-3" /> : <Shield className="w-3 h-3 animate-pulse" />} {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {(isOwner || (projectData.memberships?.find((m: any) => m.email === user?.email)?.role === 'admin' && member.role !== 'admin')) && (
                    <button 
                      onClick={() => handleRemoveMember(member.email)}
                      className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Published App Access ─────────────────────────────────────── */}
      <div className="mt-8 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <Shield className="w-5 h-5 text-neutral-500" />
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Published App Access</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Controls who can access published app URLs for this project</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {/* Require Sign-In toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-900 dark:text-white mb-0.5">Require Sign-In</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                When <strong>enabled</strong>, users must log into Nexus with an account that belongs to this project before accessing published app URLs.
                When <strong>disabled</strong>, published apps are fully public — anyone with the URL can use them without logging in.
              </p>
            </div>
            <button
              onClick={() => setProjSettings({ requireSignIn: !projSettings.requireSignIn })}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none mt-1",
                projSettings.requireSignIn ? "bg-primary-600" : "bg-neutral-200 dark:bg-neutral-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                  projSettings.requireSignIn ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
          {/* Status badge */}
          <div className={cn(
            "flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium",
            projSettings.requireSignIn
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400"
              : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400"
          )}>
            <div className={cn("w-2 h-2 rounded-full shrink-0", projSettings.requireSignIn ? "bg-amber-500" : "bg-emerald-500")} />
            {projSettings.requireSignIn
              ? "Sign-in required — only project members can access published apps"
              : "Public access — anyone with the URL can use published apps"}
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}></div>
          <div className="relative bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 dark:text-white">Share Workspace Access</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    autoFocus
                    type="email" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-[#1A1A1A] border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-600/20 outline-none dark:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Role Assignment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteRole('member')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      inviteRole === 'member' 
                        ? "border-primary-600 bg-primary-50/50 text-primary-600 ring-2 ring-primary-600/10" 
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-400"
                    )}
                  >
                    <span className="block text-xs font-bold mb-0.5">Member</span>
                    <span className="text-[10px] opacity-70">View and edit data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole('admin')}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      inviteRole === 'admin' 
                        ? "border-primary-600 bg-primary-50/50 text-primary-600 ring-2 ring-primary-600/10" 
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-400"
                    )}
                  >
                    <span className="block text-xs font-bold mb-0.5">Admin</span>
                    <span className="text-[10px] opacity-70">Full workspace control</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all"
                >Cancel</button>
                <button 
                  type="submit"
                  disabled={loading || !inviteEmail}
                  className="flex-1 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
