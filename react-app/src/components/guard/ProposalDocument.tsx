/**
 * ProposalDocument Component
 * 
 * PDF-style document wrapper for proposal descriptions.
 * Features:
 * - White/light background (document-like)
 * - A4-ish aspect ratio feel
 * - Deep shadow (shadow-2xl)
 * - Subtle hover zoom effect (hover:scale-[1.01])
 * - react-markdown rendering for description
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, User, DollarSign, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProposalDocumentProps {
  title: string;
  description: string;
  proposerAddress?: string;
  requestedAmount?: string;
  tokenSymbol?: string;
  createdAt?: Date | string;
  votingDeadline?: Date | string;
  className?: string;
}

/**
 * Format date for display
 */
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'TBD';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Truncate address for display
 */
const truncateAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format amount with commas
 */
const formatAmount = (amount: string | undefined, symbol: string | undefined): string => {
  if (!amount) return 'TBD';
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return `${num.toLocaleString()} ${symbol || ''}`;
};

const ProposalDocument: React.FC<ProposalDocumentProps> = ({
  title,
  description,
  proposerAddress,
  requestedAmount,
  tokenSymbol,
  createdAt,
  votingDeadline,
  className = '',
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        relative rounded-xl overflow-hidden
        shadow-2xl shadow-black/40
        transition-shadow duration-300
        hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]
        ${className}
      `}
    >
      {/* Paper Background - White/Cream for document feel */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900">
        {/* Document Header - Like a letterhead */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-8 py-6">
          <div className="flex items-start justify-between">
            {/* Title Area */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
                <FileText className="w-4 h-4" />
                <span className="font-medium">DAO Proposal</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                {title}
              </h1>
            </div>
          </div>
          
          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            {/* Proposer */}
            {proposerAddress && (
              <div className="flex items-center space-x-1.5 text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span className="font-mono">{truncateAddress(proposerAddress)}</span>
              </div>
            )}
            
            {/* Amount */}
            {requestedAmount && (
              <div className="flex items-center space-x-1.5 text-slate-600">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold">{formatAmount(requestedAmount, tokenSymbol)}</span>
              </div>
            )}
            
            {/* Created Date */}
            {createdAt && (
              <div className="flex items-center space-x-1.5 text-slate-600">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>{formatDate(createdAt)}</span>
              </div>
            )}
            
            {/* Deadline */}
            {votingDeadline && (
              <div className="flex items-center space-x-1.5 text-slate-600">
                <Tag className="w-4 h-4 text-orange-500" />
                <span>Vote by {formatDate(votingDeadline)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Document Body - Markdown Content */}
        <div className="px-8 py-6">
          <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-indigo-600 hover:prose-a:text-indigo-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headings - Document style
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-slate-900 mb-4 mt-8 first:mt-0 pb-2 border-b border-slate-200">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-slate-800 mb-3 mt-6 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-5 first:mt-0">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-semibold text-slate-700 mb-2 mt-4">
                    {children}
                  </h4>
                ),
                
                // Paragraphs
                p: ({ children }) => (
                  <p className="text-slate-700 leading-relaxed mb-4 last:mb-0">
                    {children}
                  </p>
                ),
                
                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc list-outside ml-6 space-y-2 mb-4 text-slate-700">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside ml-6 space-y-2 mb-4 text-slate-700">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-slate-700 leading-relaxed pl-1">
                    {children}
                  </li>
                ),
                
                // Horizontal rule - Styled divider
                hr: () => (
                  <hr className="my-6 border-slate-200" />
                ),
                
                // Blockquote - Callout style
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 bg-indigo-50 pl-4 py-2 pr-4 my-4 rounded-r-lg text-slate-700 italic">
                    {children}
                  </blockquote>
                ),
                
                // Links
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-500 transition-colors"
                  >
                    {children}
                  </a>
                ),
                
                // Tables - Professional document tables
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-100">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-100">
                    {children}
                  </td>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-slate-50 transition-colors">
                    {children}
                  </tr>
                ),
                
                // Code - Inline and block
                code: ({ className, children, ...props }) => {
                  // Check if it's inline code (no className or not in a pre)
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-sm font-mono border border-slate-200">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={`block p-4 bg-slate-800 text-slate-100 rounded-lg text-sm font-mono overflow-x-auto ${className || ''}`}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="my-4 rounded-lg overflow-hidden">
                    {children}
                  </pre>
                ),
                
                // Strong/Bold
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">
                    {children}
                  </strong>
                ),
                
                // Emphasis/Italic
                em: ({ children }) => (
                  <em className="italic text-slate-600">
                    {children}
                  </em>
                ),
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Document Footer - Subtle stamp effect */}
        <div className="border-t border-slate-200 bg-slate-50 px-8 py-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI Guard DAO Governance Document</span>
            <span>Generated for review</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProposalDocument;
