import { CREDIT_COSTS } from '@/config/plans';

/** What each action costs, with a line on when it is worth it. */
const NOTES: Record<(typeof CREDIT_COSTS)[number]['label'], string> = {
  'Draft thumbnail': 'Fast, clean text. The right default for most uploads.',
  'Quality thumbnail':
    'Slower model with sharper typography and stronger face consistency.',
  'Thumbnail from your photo':
    'Designed around your photo on the Pro model, keeping your face.',
  'Edit an existing image':
    'Change an image you already have, or composite reference photos.',
};

export const CreditCostTable = ({ className }: { className?: string }) => (
  <div className={className}>
    <div className='overflow-hidden rounded-xl border bg-card'>
      <table className='w-full text-left text-sm'>
        <thead className='border-b bg-secondary/60 text-xs text-muted-foreground'>
          <tr>
            <th className='px-4 py-2.5 font-medium'>Action</th>
            <th className='px-4 py-2.5 text-right font-medium'>
              Cost per image
            </th>
          </tr>
        </thead>
        <tbody className='divide-y'>
          {CREDIT_COSTS.map((item) => (
            <tr key={item.label}>
              <td className='px-4 py-3 align-top'>
                <div className='font-medium'>{item.label}</div>
                <div className='mt-0.5 text-xs text-muted-foreground'>
                  {NOTES[item.label]}
                </div>
              </td>
              <td className='whitespace-nowrap px-4 py-3 text-right align-top'>
                <span className='font-mono tabular-nums'>{item.credits}</span>{' '}
                <span className='text-muted-foreground'>
                  {item.credits === 1 ? 'credit' : 'credits'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className='mt-3 text-xs text-muted-foreground'>
      Generating several variations charges per image. If a generation fails,
      its credits go back to your balance automatically.
    </p>
  </div>
);
