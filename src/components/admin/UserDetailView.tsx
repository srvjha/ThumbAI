'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Coins,
  FlagOff,
  IndianRupee,
  MonitorSmartphone,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminUser } from '@/hooks/admin';
import type { AdminUserDetail } from '@/types/admin';
import { useUserActions } from './actions';
import { ACTION_LABELS, actionDetail } from './AuditView';
import { GenerationSheet } from './GenerationSheet';
import {
  ago,
  categoryLabel,
  countryFlag,
  countryName,
  dateTime,
  duration,
  fmt,
  rupees,
  WORKFLOWS,
} from './format';
import {
  deviceIcon,
  GenStatus,
  KpiCard,
  Pill,
  SeverityBadge,
  TableEmpty,
} from './ui';

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='min-w-0'>
    <dt className='text-xs text-muted-foreground'>{label}</dt>
    <dd className='mt-0.5 truncate text-sm'>{children}</dd>
  </div>
);

const Card = ({ children }: { children: ReactNode }) => (
  <div className='overflow-hidden rounded-xl border bg-card'>{children}</div>
);

const Header = ({ user }: { user: AdminUserDetail }) => {
  const openFlags = user.flags.filter((f) => !f.resolvedAt).length;
  const { open, dialogs, isAdmin } = useUserActions({
    id: user.id,
    email: user.email,
    credits: user.credits,
    role: user.role,
    suspendedAt: user.suspendedAt,
    openFlags,
  });
  return (
    <>
      <Link
        href='/admin/users'
        className='mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='size-4' /> All users
      </Link>
      <div className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex min-w-0 items-center gap-4'>
          <Avatar className='size-14'>
            {user.imageUrl && <AvatarImage src={user.imageUrl} alt='' />}
            <AvatarFallback>
              {(user.name || user.email)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <h1 className='truncate font-serif text-3xl tracking-tight'>
              {user.name || user.email}
            </h1>
            <div className='mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground'>
              {user.name && <span className='truncate'>{user.email}</span>}
              <Pill>{user.plan === 'PAID' ? 'Paid' : 'Free'}</Pill>
              {isAdmin && <Pill>Admin</Pill>}
              {user.suspendedAt && (
                <Pill className='border-destructive/30 bg-destructive/10 text-destructive'>
                  Suspended
                </Pill>
              )}
              {openFlags > 0 && (
                <Pill className='border-destructive/30 bg-destructive/10 text-destructive'>
                  {openFlags} open flag{openFlags === 1 ? '' : 's'}
                </Pill>
              )}
              {user.deletedAt && <Pill>Deleted</Pill>}
            </div>
          </div>
        </div>
        {!user.deletedAt && (
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={() => open('credits')}>
              <Coins /> Credits
            </Button>
            <Button
              variant='outline'
              disabled={openFlags === 0}
              onClick={() => open('flags')}
            >
              <FlagOff /> Reset flags
            </Button>
            {user.suspendedAt ? (
              <Button variant='outline' onClick={() => open('unsuspend')}>
                <ShieldCheck /> Lift suspension
              </Button>
            ) : (
              <Button
                variant='destructive'
                disabled={isAdmin}
                onClick={() => open('suspend')}
              >
                <ShieldOff /> Suspend
              </Button>
            )}
          </div>
        )}
      </div>
      {user.suspendedAt && (
        <div className='mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          Suspended {dateTime(user.suspendedAt)}
          {user.suspendedReason && <> · “{user.suspendedReason}”</>}
        </div>
      )}
      {dialogs}
    </>
  );
};

export const UserDetailView = ({ id }: { id: string }) => {
  const { data: user, isLoading, error } = useAdminUser(id);
  const [generation, setGeneration] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='h-14 w-72 animate-pulse rounded-lg bg-accent' />
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-5'>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className='h-24 animate-pulse rounded-xl bg-accent' />
          ))}
        </div>
      </div>
    );
  }
  if (error || !user) {
    return <TableEmpty>That user could not be found.</TableEmpty>;
  }

  const finished = user.stats.completed + user.stats.failed;

  return (
    <>
      <Header user={user} />

      <div className='mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5'>
        <KpiCard
          label='Credits left'
          icon={Coins}
          value={fmt(user.credits)}
          hint={`${fmt(user.stats.creditsSpent)} spent in total`}
        />
        <KpiCard
          label='Generations'
          icon={Activity}
          value={fmt(user.thumbnailCount)}
          hint={`${fmt(user.stats.completed)} done · ${fmt(user.stats.failed)} failed${user.stats.open ? ` · ${user.stats.open} running` : ''}`}
        />
        <KpiCard
          label='Success rate'
          icon={CheckCircle2}
          value={
            finished
              ? `${Math.round((user.stats.completed / finished) * 100)}%`
              : '—'
          }
        />
        <KpiCard
          label='Paid'
          icon={IndianRupee}
          value={rupees(user.stats.paid)}
          hint={`${user.orders.filter((o) => o.status === 'paid').length} orders`}
        />
        <KpiCard
          label='Devices'
          icon={MonitorSmartphone}
          value={fmt(user.devices.length)}
          hint={`${fmt(user.devices.reduce((a, d) => a + d.pageviews, 0))} page views`}
        />
      </div>

      <Card>
        <dl className='grid grid-cols-2 gap-x-6 gap-y-4 p-4 sm:grid-cols-3 lg:grid-cols-6'>
          <Fact label='Location'>
            {user.country ? (
              <>
                {countryFlag(user.country)}{' '}
                {[user.city, user.region, countryName(user.country)]
                  .filter(Boolean)
                  .join(', ')}
              </>
            ) : (
              '—'
            )}
          </Fact>
          <Fact label='Came from'>{user.source ?? '—'}</Fact>
          <Fact label='Joined'>{dateTime(user.createdAt)}</Fact>
          <Fact label='Last active'>{ago(user.lastActiveAt)}</Fact>
          <Fact label='Signup credits'>
            {user.signupCredits
              ? user.signupCredits.granted
                ? 'Granted'
                : `Refused (${user.signupCredits.reason?.replace('_', ' ')})`
              : 'Not decided yet'}
          </Fact>
          <Fact label='Clerk id'>
            <span className='font-mono text-xs'>{user.clerkId}</span>
          </Fact>
        </dl>
      </Card>

      <Tabs defaultValue='generations' className='mt-6'>
        <TabsList className='flex-wrap'>
          <TabsTrigger value='generations'>
            Generations ({fmt(user.thumbnailCount)})
          </TabsTrigger>
          <TabsTrigger value='credits'>Credits</TabsTrigger>
          <TabsTrigger value='devices'>
            Devices ({user.devices.length})
          </TabsTrigger>
          <TabsTrigger value='flags'>Flags ({user.flags.length})</TabsTrigger>
          <TabsTrigger value='orders'>
            Orders ({user.orders.length})
          </TabsTrigger>
          <TabsTrigger value='activity'>Admin history</TabsTrigger>
        </TabsList>

        <TabsContent value='generations'>
          <Card>
            {user.thumbnails.length === 0 ? (
              <TableEmpty>No generations yet.</TableEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='pl-4'>Result</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Took</TableHead>
                    <TableHead className='pr-4'>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.thumbnails.map((t) => (
                    <TableRow
                      key={t.id}
                      className='cursor-pointer'
                      onClick={() => setGeneration(t.id)}
                    >
                      <TableCell className='pl-4'>
                        <div className='relative h-9 w-16 overflow-hidden rounded-md border bg-secondary'>
                          {t.imageUrl[0] && (
                            <img
                              src={t.imageUrl[0]}
                              alt=''
                              loading='lazy'
                              className='size-full object-cover'
                            />
                          )}
                          {t.flagged && (
                            <span
                              className='absolute top-0.5 right-0.5 size-2 rounded-full bg-destructive'
                              title='Prompt flagged'
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                        {dateTime(t.createdAt)}
                      </TableCell>
                      <TableCell className='text-sm whitespace-nowrap'>
                        {WORKFLOWS[t.workflow ?? 'UNKNOWN']}
                        <span className='ml-1.5 text-xs text-muted-foreground'>
                          {t.tier?.toLowerCase() ?? 'edit'} ·{' '}
                          {t.aspectRatio ?? '—'} · {t.images ?? 1}×
                        </span>
                      </TableCell>
                      <TableCell>
                        <GenStatus status={t.status} />
                      </TableCell>
                      <TableCell className='text-right font-mono text-xs tabular-nums'>
                        {duration(t.latencyMs)}
                      </TableCell>
                      <TableCell
                        className='max-w-56 truncate pr-4 text-xs text-destructive'
                        title={t.error ?? undefined}
                      >
                        {t.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='credits'>
          <Card>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='pl-4'>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className='text-right'>Change</TableHead>
                  <TableHead className='text-right'>Balance</TableHead>
                  <TableHead className='pr-4'>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.creditHistory.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className='pl-4 text-xs whitespace-nowrap text-muted-foreground'>
                      {dateTime(t.createdAt)}
                    </TableCell>
                    <TableCell className='text-sm capitalize'>
                      {t.type.replaceAll('_', ' ').toLowerCase()}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs tabular-nums ${t.amount < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}
                    >
                      {t.amount > 0 ? '+' : ''}
                      {t.amount}
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs tabular-nums'>
                      {t.balanceAfter}
                    </TableCell>
                    <TableCell className='max-w-80 truncate pr-4 text-xs text-muted-foreground'>
                      {t.note ?? ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value='devices'>
          <Card>
            {user.devices.length === 0 ? (
              <TableEmpty>
                No signed-in visits recorded yet. Devices appear after this
                user's next visit.
              </TableEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='pl-4'>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>First source</TableHead>
                    <TableHead className='text-right'>Page views</TableHead>
                    <TableHead>First seen</TableHead>
                    <TableHead className='pr-4'>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.devices.map((d) => {
                    const Icon = deviceIcon(d.device);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className='pl-4'>
                          <span className='flex items-center gap-2 text-sm'>
                            <Icon className='size-4 text-muted-foreground' />
                            {d.browser ?? 'Unknown browser'} on{' '}
                            {d.os ?? 'unknown OS'}
                            <span className='text-xs text-muted-foreground capitalize'>
                              {d.device}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className='text-sm'>
                          {countryFlag(d.country)}{' '}
                          {[d.city, countryName(d.country)]
                            .filter(Boolean)
                            .join(', ')}
                        </TableCell>
                        <TableCell className='text-sm'>{d.source}</TableCell>
                        <TableCell className='text-right font-mono text-xs tabular-nums'>
                          {fmt(d.pageviews)}
                        </TableCell>
                        <TableCell className='text-xs whitespace-nowrap text-muted-foreground'>
                          {dateTime(d.firstSeenAt)}
                        </TableCell>
                        <TableCell className='pr-4 text-xs whitespace-nowrap text-muted-foreground'>
                          {ago(d.lastSeenAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='flags'>
          <Card>
            {user.flags.length === 0 ? (
              <TableEmpty>No prompts flagged.</TableEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='pl-4'>When</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Check</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead className='text-right'>Score</TableHead>
                    <TableHead className='pr-4'>Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.flags.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className='pl-4 text-xs whitespace-nowrap text-muted-foreground'>
                        {dateTime(f.createdAt)}
                      </TableCell>
                      <TableCell>
                        <SeverityBadge severity={f.severity} />
                      </TableCell>
                      <TableCell className='text-sm'>
                        {f.source === 'MODERATION' ? 'Content' : 'Injection'}
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {f.categories.map((c) => (
                            <Pill key={c}>{categoryLabel(c)}</Pill>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className='text-right font-mono text-xs tabular-nums'>
                        {f.score == null ? '—' : f.score.toFixed(2)}
                      </TableCell>
                      <TableCell className='pr-4 text-xs text-muted-foreground'>
                        {f.resolvedAt
                          ? `Reviewed by ${f.resolvedBy ?? 'admin'}, ${ago(f.resolvedAt)}`
                          : 'Open'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='orders'>
          <Card>
            {user.orders.length === 0 ? (
              <TableEmpty>No orders.</TableEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='pl-4'>When</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                    <TableHead className='text-right'>Credits</TableHead>
                    <TableHead className='pr-4'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className='pl-4 text-xs whitespace-nowrap text-muted-foreground'>
                        {dateTime(o.createdAt)}
                      </TableCell>
                      <TableCell className='text-sm'>{o.product}</TableCell>
                      <TableCell className='text-right font-mono text-xs tabular-nums'>
                        {rupees(o.amount)}
                      </TableCell>
                      <TableCell className='text-right font-mono text-xs tabular-nums'>
                        {o.credits}
                      </TableCell>
                      <TableCell className='pr-4'>
                        <Pill className='capitalize'>{o.status}</Pill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value='activity'>
          <Card>
            {user.actions.length === 0 ? (
              <TableEmpty>No admin has changed this account.</TableEmpty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='pl-4'>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className='pr-4'>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.actions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className='pl-4 text-xs whitespace-nowrap text-muted-foreground'>
                        {dateTime(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Pill>{ACTION_LABELS[a.action] ?? a.action}</Pill>
                      </TableCell>
                      <TableCell className='text-sm'>{a.admin}</TableCell>
                      <TableCell className='max-w-96 truncate pr-4 text-sm text-muted-foreground'>
                        {actionDetail(a.action, a.detail)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <GenerationSheet id={generation} onClose={() => setGeneration(null)} />
    </>
  );
};
