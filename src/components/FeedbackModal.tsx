import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquarePlus, 
  Star, 
  Send, 
  Heart, 
  Check, 
  Sparkles, 
  Filter, 
  ShieldCheck, 
  MessageCircle, 
  ThumbsUp, 
  Lightbulb, 
  Bug, 
  Palette, 
  Bot, 
  TrendingUp,
  User as UserIcon,
  Smile
} from 'lucide-react';
import { fetchAllFeedback, submitFeedback, likeFeedback, updateFeedbackStatus } from '../utils/feedbackService.ts';
import type { FeedbackItem, FeedbackCategory } from '../types/feedback.ts';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  currentUserId?: string | null;
}

const CATEGORY_LABELS: Record<FeedbackCategory, { label: string; icon: React.ReactNode; color: string }> = {
  general: { label: 'Opinión General', icon: <Star className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  feature: { label: 'Sugerencia / Idea', icon: <Lightbulb className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  design: { label: 'Diseño / Experiencia', icon: <Palette className="w-3.5 h-3.5" />, color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  bug: { label: 'Reportar Falla', icon: <Bug className="w-3.5 h-3.5" />, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  ai: { label: 'IA y Contenido', icon: <Bot className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
};

const RATING_EMOJIS = ['😡 Malo', '😕 Regular', '😐 Aceptable', '😊 Bueno', '😍 ¡Excelente!'];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  currentUserName,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'wall'>('create');
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [comment, setComment] = useState<string>('');
  const [userName, setUserName] = useState<string>(currentUserName || '');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const isAdmin = currentUserEmail === 'alexparababi23@gmail.com';

  useEffect(() => {
    if (isOpen) {
      loadFeedback();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentUserName && !userName) {
      setUserName(currentUserName);
    }
  }, [currentUserName]);

  const loadFeedback = async () => {
    setLoading(true);
    const data = await fetchAllFeedback();
    setFeedbackList(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    const finalName = isAnonymous ? 'Estudiante Anónimo' : (userName.trim() || 'Estudiante');

    const created = await submitFeedback({
      userId: currentUserId || undefined,
      userName: finalName,
      userEmail: isAnonymous ? undefined : (currentUserEmail || undefined),
      rating,
      category,
      comment: comment.trim(),
    });

    setFeedbackList((prev) => [created, ...prev]);
    setSubmitting(false);
    setComment('');
    setSuccessMessage('¡Muchas gracias por tu sugerencia! Tu opinión ayuda a mejorar Genius.');
    setActiveTab('wall');

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleLike = async (id: string, currentLikes: number) => {
    if (likedMap[id]) return; // prevent multiple likes in same session
    setLikedMap((prev) => ({ ...prev, [id]: true }));
    
    setFeedbackList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, likes: item.likes + 1 } : item))
    );

    await likeFeedback(id, currentLikes);
  };

  const handleStatusChange = async (id: string, status: FeedbackItem['status']) => {
    setFeedbackList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    await updateFeedbackStatus(id, status);
  };

  // Average Rating Calculation
  const totalReviews = feedbackList.length;
  const avgRating = totalReviews > 0 
    ? (feedbackList.reduce((acc, item) => acc + item.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const filteredList = filterCategory === 'all'
    ? feedbackList
    : feedbackList.filter((item) => item.category === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Sugerencias y Opiniones
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {avgRating} / 5.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tu retroalimentación construye el futuro de Genius AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('wall')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'wall'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Ver Opiniones ({totalReviews})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>+ Dejar Sugerencia</span>
          </button>
        </div>

        {/* Notification Alert */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'create' ? (
            /* FORMULARIO DE SUGERENCIAS */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rating Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  ¿Qué tal te parece la página hasta ahora?
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`flex-1 py-2.5 px-2 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        rating >= star
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 scale-102'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${rating >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                      <span className="text-[10px] font-black">{star} ★</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-center font-bold text-amber-600 dark:text-amber-400 mt-2">
                  {RATING_EMOJIS[rating - 1]}
                </p>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Categoría de tu comentario
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => {
                    const info = CATEGORY_LABELS[cat];
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <span className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                          {info.icon}
                        </span>
                        <span className="truncate">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Escribe tu sugerencia u opinión
                  </label>
                  <span className="text-[10px] text-slate-400">{comment.length}/1000</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  required
                  placeholder="Escribe tus ideas, opiniones, o fallas que hayas notado..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* User Name & Anonymous Check */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Tu Nombre o Apodo
                  </label>
                  <input
                    type="text"
                    disabled={isAnonymous}
                    placeholder="Ej. María o Carlos"
                    value={isAnonymous ? 'Anónimo' : userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4 sm:pt-4">
                  <input
                    type="checkbox"
                    id="chk-anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="chk-anonymous" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                    Publicar de forma Anónima
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Enviando...' : 'Enviar Sugerencia'}</span>
              </button>
            </form>
          ) : (
            /* MURO DE OPINIONES DE LA COMUNIDAD */
            <div className="space-y-4">
              {/* Top Banner Stats */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Comunidad de Estudiantes Genius
                  </p>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                    Lee lo que opinan otros usuarios o apoya sus sugerencias favoritas.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-amber-500 font-black text-lg">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{avgRating}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Promedio general</span>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    filterCategory === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Todas ({feedbackList.length})
                </button>
                {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => {
                  const info = CATEGORY_LABELS[cat];
                  const count = feedbackList.filter((f) => f.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                        filterCategory === cat
                          ? info.color
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      {info.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Feedback List */}
              {loading ? (
                <div className="text-center py-12 text-slate-400">
                  <Sparkles className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                  <p className="text-xs">Cargando sugerencias de la comunidad...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No hay sugerencias en esta categoría aún.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    Sé el primero en dejar una
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredList.map((item) => {
                    const catInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.general;
                    const isLiked = likedMap[item.id];

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 shadow-xs space-y-2.5 transition-all hover:border-blue-300 dark:hover:border-blue-700"
                      >
                        {/* Item Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                              {item.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {item.userName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Stars */}
                            <div className="flex items-center text-amber-400 text-xs font-bold">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < item.rating ? 'fill-amber-400' : 'text-slate-200 dark:text-slate-800'}`}
                                />
                              ))}
                            </div>

                            {/* Category Badge */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </div>
                        </div>

                        {/* Comment Content */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {item.comment}
                        </p>

                        {/* Status Badge & Upvote Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900">
                          <div className="flex items-center gap-2">
                            {item.status === 'implemented' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" /> ¡Implementado!
                              </span>
                            )}
                            {item.status === 'planned' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Planificado
                              </span>
                            )}
                            {item.status === 'reviewing' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                En Revisión
                              </span>
                            )}

                            {/* Admin Controls */}
                            {isAdmin && (
                              <select
                                value={item.status || 'pending'}
                                onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 font-semibold text-slate-700 dark:text-slate-300"
                              >
                                <option value="pending">Pendiente</option>
                                <option value="reviewing">En Revisión</option>
                                <option value="planned">Planificado</option>
                                <option value="implemented">Implementado</option>
                              </select>
                            )}
                          </div>

                          {/* Upvote Button */}
                          <button
                            onClick={() => handleLike(item.id, item.likes)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              isLiked
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
                            <span>{item.likes}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
