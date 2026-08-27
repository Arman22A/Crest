do $$
declare
  reminder_job record;
begin
  select jobid, command
    into reminder_job
    from cron.job
   where jobname = 'crest-dispatch-reminders';

  if not found then
    return;
  end if;

  if position('/crest-cron-dispatch' in reminder_job.command) > 0 then
    return;
  end if;

  if position('/crest-api' in reminder_job.command) = 0 then
    raise exception 'crest-dispatch-reminders has an unexpected command';
  end if;

  perform cron.alter_job(
    job_id := reminder_job.jobid,
    command := replace(reminder_job.command, '/crest-api', '/crest-cron-dispatch')
  );
end;
$$;
