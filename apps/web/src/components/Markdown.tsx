import { Fragment } from 'react';
import { parseInline, parseMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        switch (part.kind) {
          case 'strong':
            return <strong key={i}>{part.text}</strong>;
          case 'code':
            return (
              <code key={i} className="rounded bg-muted px-1 text-[0.85em]">
                {part.text}
              </code>
            );
          case 'ref':
            return (
              <span key={i} className="whitespace-nowrap text-xs text-muted-foreground" title="Oznaka iz Matrice zahteva / zapisa izvora">
                [{part.text}]
              </span>
            );
          default:
            return <Fragment key={i}>{part.text}</Fragment>;
        }
      })}
    </>
  );
}

/** Renders research Markdown as plain React elements (no HTML injection). */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 text-sm leading-relaxed', className)}>
      {parseMarkdown(source).map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <div key={i} className={cn('font-semibold', block.level <= 3 ? 'pt-2 text-base' : 'text-sm')}>
                <Inline text={block.text} />
              </div>
            );
          case 'paragraph':
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            );
          case 'quote':
            return (
              <p key={i} className="border-l-2 pl-3 text-muted-foreground">
                <Inline text={block.text} />
              </p>
            );
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List key={i} className={cn('flex flex-col gap-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-md border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      {block.header.map((h, j) => (
                        <th key={j} className="px-2 py-1.5 font-medium">
                          <Inline text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className="border-t align-top">
                        {row.map((cell, c) => (
                          <td key={c} className="px-2 py-1.5">
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'rule':
            return <hr key={i} />;
        }
      })}
    </div>
  );
}
