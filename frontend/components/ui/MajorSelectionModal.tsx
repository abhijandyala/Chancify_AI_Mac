'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, GraduationCap, ChevronDown } from 'lucide-react'
import { MAJORS } from '@/lib/majors'

interface MajorSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedMajor: string
  onSelectMajor: (major: string) => void
}

export function MajorSelectionModal({ 
  isOpen, 
  onClose, 
  selectedMajor, 
  onSelectMajor 
}: MajorSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Filter majors based on search query
  const filteredMajors = MAJORS.filter(major =>
    major.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen && modalRef.current) {
      document.addEventListener('mousedown', handleClickOutside)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleMajorSelect = (major: string) => {
    onSelectMajor(major)
    onClose()
    setSearchQuery('') // Clear search when closing
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal Content */}
          <motion.div
            ref={modalRef}
            className="relative w-full max-w-lg max-h-[70vh] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/15 text-primary">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Intended Major</h2>
                    <p className="text-sm text-white/60">Select your field of study</p>
                  </div>
                </div>
                
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4 text-white/70" />
                </motion.button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search majors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Majors List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredMajors.length > 0 ? (
                <div className="p-2">
                  {filteredMajors.map((major, index) => (
                    <motion.button
                      key={major}
                      onClick={() => handleMajorSelect(major)}
                      className={`w-full px-3 py-3 text-left rounded-lg transition-all duration-200 border-b border-white/5 last:border-b-0 ${
                        selectedMajor === major 
                          ? 'bg-primary/20 text-primary border-primary/30' 
                          : 'hover:bg-white/10 text-white'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.01 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{major}</span>
                        {selectedMajor === major && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 rounded-full bg-primary"
                          />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-white/50">
                    <p>No majors found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">
                  {filteredMajors.length} major{filteredMajors.length !== 1 ? 's' : ''} found
                </div>
                <motion.button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
