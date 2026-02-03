import crypto from 'crypto';

export function hashJob(job) {
    return crypto
        .createHash('sha256')
        .update(`${job.jobTitle}|${job.companyName}|${job.location}`)
        .digest('hex');
}
