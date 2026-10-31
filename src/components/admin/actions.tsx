'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import {
  Coins,
  Eye,
  FlagOff,
  Loader2,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdjustCredits,
  useResetFlags,
  useSetSuspended,
} from '@/hooks/admin';
import { cn } from '@/lib/utils';
import { fmt } from './format';

export interface ActionTarget {
  id: string;
  email: string;
  credits: number;
  role: string;
  suspendedAt: string | null;
  openFlags: number;
}

type Open = 'credits' | 'suspend' | 'unsuspend' | 'flags' | null;

const QUICK = [5, 10, 25, 50];

const CreditsDialog = ({
  user,
  open,
  onOpenChange,
}: {
  user: ActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('');
  const adjust = useAdjustCredits();

  const value = Number(amount);
  const valid =
    Number.isInteger(value) && value > 0 && reason.trim().length > 0;
  const signed = direction === 'add' ? value : -value;
  const after = user.credits + (Number.isFinite(signed) ? signed : 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || after < 0) return;
    adjust.mutate(
      { userId: user.id, amount: signed, reason: reason.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={submit} className='grid gap-5'>
          <DialogHeader>
            <DialogTitle>Adjust credits</DialogTitle>
            <DialogDescription className='truncate'>
              {user.email}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-2 gap-1 rounded-lg border p-1'>
            {(['add', 'remove'] as const).map((d) => (
              <button
                key={d}
                type='button'
                onClick={() => setDirection(d)}
                className={cn(
                  'h-8 rounded-md text-sm capitalize',
                  direction === d
                    ? 'bg-secondary font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='credit-amount'>Credits</Label>
            <Input
              id='credit-amount'
              inputMode='numeric'
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className='font-mono'
              autoFocus
            />
            <div className='flex gap-1.5'>
              {QUICK.map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setAmount(String(n))}
                  className='h-7 rounded-md border px-2.5 font-mono text-xs hover:bg-secondary'
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='credit-reason'>Reason</Label>
            <Textarea
              id='credit-reason'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Support goodwill, failed render, promo…'
              rows={2}
              maxLength={500}
            />
            <p className='text-xs text-muted-foreground'>
              Saved to the ledger and the audit log with your email.
            </p>
          </div>

          <div className='flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm'>
            <span className='text-muted-foreground'>Balance</span>
            <span className='font-mono tabular-nums'>
              {fmt(user.credits)} →{' '}
              <span className={cn(after < 0 && 'text-destructive')}>
                {fmt(after)}
              </span>
            </span>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={!valid || after < 0 || adjust.isPending}
              className='btn-brand'
            >
              {adjust.isPending && <Loader2 className='animate-spin' />}
              {direction === 'add'
                ? `Add ${value || ''}`
                : `Remove ${value || ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SuspendDialog = ({
  user,
  open,
  onOpenChange,
}: {
  user: ActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [reason, setReason] = useState('');
  const suspend = useSetSuspended();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    suspend.mutate(
      { userId: user.id, suspended: true, reason: reason.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={submit} className='grid gap-5'>
          <DialogHeader>
            <DialogTitle>Suspend this account?</DialogTitle>
            <DialogDescription>
              {user.email} stays signed in but can no longer generate, edit,
              upload or buy. Their library and credits are kept. You can lift it
              any time.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='suspend-reason'>Reason</Label>
            <Textarea
              id='suspend-reason'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Repeated prompt-injection attempts'
              rows={3}
              maxLength={500}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant='destructive'
              disabled={!reason.trim() || suspend.isPending}
            >
              {suspend.isPending && <Loader2 className='animate-spin' />}
              Suspend
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirm: string;
  pending: boolean;
  onConfirm: () => void;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        {/* A plain button: the dialog closes when the request lands. */}
        <Button onClick={onConfirm} disabled={pending}>
          {pending && <Loader2 className='animate-spin' />}
          {confirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/** Every action on one user, with their dialogs. */
export const useUserActions = (user: ActionTarget) => {
  const [open, setOpen] = useState<Open>(null);
  const unsuspend = useSetSuspended();
  const reset = useResetFlags();
  const close = (next: boolean) => !next && setOpen(null);
  const isAdmin = user.role === 'ADMIN';

  const dialogs = (
    <>
      <CreditsDialog
        user={user}
        open={open === 'credits'}
        onOpenChange={close}
      />
      <SuspendDialog
        user={user}
        open={open === 'suspend'}
        onOpenChange={close}
      />
      <ConfirmDialog
        open={open === 'unsuspend'}
        onOpenChange={close}
        title='Lift the suspension?'
        description={`${user.email} will be able to generate and buy again straight away.`}
        confirm='Lift suspension'
        pending={unsuspend.isPending}
        onConfirm={() =>
          unsuspend.mutate(
            { userId: user.id, suspended: false },
            { onSuccess: () => setOpen(null) },
          )
        }
      />
      <ConfirmDialog
        open={open === 'flags'}
        onOpenChange={close}
        title={`Reset ${user.openFlags} open flag${user.openFlags === 1 ? '' : 's'}?`}
        description='They are marked reviewed under your email and stay on the user’s record. New flags will appear as usual.'
        confirm='Reset flags'
        pending={reset.isPending}
        onConfirm={() =>
          reset.mutate({ userId: user.id }, { onSuccess: () => setOpen(null) })
        }
      />
    </>
  );

  return { open: setOpen, dialogs, isAdmin };
};

/** The ⋯ menu on a user row. */
export const UserActionsMenu = ({
  user,
  showView = true,
}: {
  user: ActionTarget;
  showView?: boolean;
}) => {
  const { open, dialogs, isAdmin } = useUserActions(user);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label='User actions'
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-52'>
          <DropdownMenuLabel className='truncate text-xs font-normal text-muted-foreground'>
            {user.email}
          </DropdownMenuLabel>
          {showView && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}`}>
                <Eye />
                View details
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => open('credits')}>
            <Coins />
            Add or remove credits
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={user.openFlags === 0}
            onSelect={() => open('flags')}
          >
            <FlagOff />
            Reset flags
            {user.openFlags > 0 && (
              <span className='ml-auto font-mono text-xs text-muted-foreground'>
                {user.openFlags}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.suspendedAt ? (
            <DropdownMenuItem onSelect={() => open('unsuspend')}>
              <ShieldCheck />
              Lift suspension
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant='destructive'
              disabled={isAdmin}
              onSelect={() => open('suspend')}
            >
              <ShieldOff />
              {isAdmin ? 'Admins can’t be suspended' : 'Suspend user'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
};
