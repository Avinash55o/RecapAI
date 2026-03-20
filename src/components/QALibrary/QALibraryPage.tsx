// src/components/QALibrary/QALibraryPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X, Download, Upload, Save, ChevronLeft } from 'lucide-react';
import { useToast } from '../../contexts/toast';

interface QAEntry {
  id: string;
  question: string;
  aliases: string[];
  answer: string;
  tags: string[];
  language: 'en' | 'hi' | 'mixed';
  createdAt: string;
  updatedAt: string;
}

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mixed', label: 'Mixed (Hinglish)' },
];

const EMPTY_FORM: Omit<QAEntry, 'id' | 'createdAt' | 'updatedAt'> = {
  question: '',
  aliases: [],
  answer: '',
  tags: [],
  language: 'en',
};

interface QALibraryPageProps {
  onClose: () => void;
}

export function QALibraryPage({ onClose }: QALibraryPageProps) {
  const [entries, setEntries] = useState<QAEntry[]>([]);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | 'en' | 'hi' | 'mixed'>('all');
  const [editingEntry, setEditingEntry] = useState<QAEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [aliasText, setAliasText] = useState('');  // newline-separated
  const [tagText, setTagText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const loadEntries = useCallback(async () => {
    try {
      const data = await (window.electronAPI as any).qaGetAll();
      setEntries(data || []);
    } catch (err) {
      console.error('[QALibrary] load error:', err);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Filtered entries
  const filtered = entries.filter(e => {
    const matchSearch =
      !search ||
      e.question.toLowerCase().includes(search.toLowerCase()) ||
      e.aliases.some(a => a.toLowerCase().includes(search.toLowerCase())) ||
      e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchLang = langFilter === 'all' || e.language === langFilter;
    return matchSearch && matchLang;
  });

  const openAdd = () => {
    setFormData({ ...EMPTY_FORM });
    setAliasText('');
    setTagText('');
    setEditingEntry(null);
    setIsAdding(true);
  };

  const openEdit = (entry: QAEntry) => {
    setFormData({
      question: entry.question,
      aliases: entry.aliases,
      answer: entry.answer,
      tags: entry.tags,
      language: entry.language,
    });
    setAliasText(entry.aliases.join('\n'));
    setTagText(entry.tags.join(', '));
    setEditingEntry(entry);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      showToast('Validation', 'Question and Answer are required', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const aliases = aliasText
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean);
      const tags = tagText.split(',').map(t => t.trim()).filter(Boolean);
      const payload = { ...formData, aliases, tags };

      if (editingEntry) {
        await (window.electronAPI as any).qaUpdate(editingEntry.id, payload);
        showToast('Updated', 'Q&A entry updated', 'success');
      } else {
        await (window.electronAPI as any).qaAdd(payload);
        showToast('Added', 'Q&A entry added', 'success');
      }
      setIsAdding(false);
      setEditingEntry(null);
      await loadEntries();
    } catch (err) {
      showToast('Error', 'Failed to save entry', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this Q&A entry?')) return;
    try {
      await (window.electronAPI as any).qaDelete(id);
      showToast('Deleted', 'Q&A entry removed', 'success');
      await loadEntries();
    } catch {
      showToast('Error', 'Failed to delete entry', 'error');
    }
  };

  // Export
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-library-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as any[];
        for (const item of imported) {
          await (window.electronAPI as any).qaAdd({
            question: item.question || '',
            aliases: item.aliases || [],
            answer: item.answer || '',
            tags: item.tags || [],
            language: item.language || 'en',
          });
        }
        showToast('Imported', `${imported.length} entries imported`, 'success');
        await loadEntries();
      } catch {
        showToast('Error', 'Failed to import file', 'error');
      }
    };
    input.click();
  };

  return (
    <div className="qa-library-page" id="qa-library-page">
      {/* ── Top bar ── */}
      <div className="qa-header">
        <button className="qa-back" type="button" onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="qa-title">My Q&amp;A Library</h1>
        <div className="qa-header-actions">
          <button className="qa-btn-icon" type="button" onClick={handleImport} title="Import JSON">
            <Upload className="h-4 w-4" />
          </button>
          <button className="qa-btn-icon" type="button" onClick={handleExport} title="Export JSON">
            <Download className="h-4 w-4" />
          </button>
          <button className="qa-btn-primary" type="button" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Q&amp;A
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="qa-filter-bar">
        <div className="qa-search-wrap">
          <Search className="qa-search-icon h-3.5 w-3.5" />
          <input
            className="qa-search"
            placeholder="Search questions, aliases, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="qa-clear-search" onClick={() => setSearch('')}>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <select
          className="qa-lang-filter"
          value={langFilter}
          onChange={e => setLangFilter(e.target.value as any)}
        >
          <option value="all">All Languages</option>
          {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      {/* ── Add/Edit Form (slide-in panel) ── */}
      {isAdding && (
        <div className="qa-form-panel">
          <div className="qa-form-header">
            <span className="qa-form-title">{editingEntry ? 'Edit Entry' : 'New Entry'}</span>
            <button type="button" className="qa-close" onClick={() => { setIsAdding(false); setEditingEntry(null); }}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="qa-form-body">
            <label className="qa-form-label">Primary Question *</label>
            <input
              className="qa-input"
              placeholder="e.g. Tell me about yourself"
              value={formData.question}
              onChange={e => setFormData(f => ({ ...f, question: e.target.value }))}
            />

            <label className="qa-form-label" style={{ marginTop: '10px' }}>
              Aliases <span className="qa-form-hint">(one per line — Hindi/Hinglish variants)</span>
            </label>
            <textarea
              className="qa-textarea"
              rows={4}
              placeholder={"apne baare mein batao\nkhud ke baare mein batao\nIntroduce yourself"}
              value={aliasText}
              onChange={e => setAliasText(e.target.value)}
            />

            <label className="qa-form-label" style={{ marginTop: '10px' }}>Answer *</label>
            <textarea
              className="qa-textarea qa-answer"
              rows={6}
              placeholder="Type your full answer here…"
              value={formData.answer}
              onChange={e => setFormData(f => ({ ...f, answer: e.target.value }))}
            />

            <div className="qa-form-row">
              <div className="qa-form-col">
                <label className="qa-form-label">Language</label>
                <select
                  className="qa-select"
                  value={formData.language}
                  onChange={e => setFormData(f => ({ ...f, language: e.target.value as any }))}
                >
                  {LANG_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="qa-form-col">
                <label className="qa-form-label">Tags <span className="qa-form-hint">(comma separated)</span></label>
                <input
                  className="qa-input"
                  placeholder="HR, intro, DSA"
                  value={tagText}
                  onChange={e => setTagText(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              className="qa-btn-save"
              disabled={isLoading}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving…' : editingEntry ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </div>
      )}

      {/* ── Entry list ── */}
      <div className="qa-list">
        {filtered.length === 0 && (
          <div className="qa-empty">
            {entries.length === 0
              ? 'No Q&A entries yet. Click "Add Q&A" to create your first one.'
              : 'No entries match your search.'}
          </div>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className="qa-entry-card">
            <div className="qa-entry-row">
              <div className="qa-entry-main">
                <p className="qa-entry-question">{entry.question}</p>
                {entry.aliases.length > 0 && (
                  <p className="qa-entry-aliases">
                    +{entry.aliases.length} alias{entry.aliases.length > 1 ? 'es' : ''}
                    {' • '}{entry.aliases.slice(0, 2).join(' | ')}{entry.aliases.length > 2 ? '…' : ''}
                  </p>
                )}
                <div className="qa-entry-tags">
                  <span className={`qa-lang-badge qa-lang-${entry.language}`}>
                    {LANG_OPTIONS.find(l => l.value === entry.language)?.label}
                  </span>
                  {entry.tags.map(t => (
                    <span key={t} className="qa-tag">{t}</span>
                  ))}
                </div>
              </div>
              <div className="qa-entry-actions">
                <button type="button" className="qa-btn-icon" onClick={() => openEdit(entry)} title="Edit">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="qa-btn-icon qa-btn-delete" onClick={() => handleDelete(entry.id)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="qa-entry-answer-preview">{entry.answer.slice(0, 120)}{entry.answer.length > 120 ? '…' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
