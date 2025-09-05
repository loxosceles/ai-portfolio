import { Activity, GitBranch, Code } from 'lucide-react';
import ContributionGraph from './contribution-graph';
import githubData from '../../infrastructure/data/dev/github-activity-data.json';

interface GitHubStatsData {
  user: {
    login: string;
    name: string;
    public_repos: number;
  };
  activity: {
    totalEvents: number;
    recentEvents: number;
    dailyActivity: Record<string, number>;
    activityTypes: Record<string, number>;
    lastEventDate: string;
  };
  repositories: Array<{
    name: string;
    language: string | null;
    updated_at: string;
  }>;
  contributionGraph: Record<
    string,
    {
      date: string;
      count: number;
      level: number;
    }
  >;
}

export default function GitHubStatsPanel() {
  const data = githubData as GitHubStatsData;

  // Calculate metrics
  const dailyAverage = Math.round(data.activity.recentEvents / 30);
  const topLanguages = data.repositories
    .filter((repo) => repo.language)
    .reduce(
      (acc, repo) => {
        acc[repo.language!] = (acc[repo.language!] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const sortedLanguages = Object.entries(topLanguages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang]) => lang);

  const lastActivityDate = new Date(data.activity.lastEventDate).toLocaleDateString();
  const prReviews = data.activity.activityTypes.PullRequestReviewEvent || 0;
  const pullRequests = data.activity.activityTypes.PullRequestEvent || 0;

  return (
    <section className="py-16 px-6 bg-glass-light xl:max-w-[1400px] xl:mx-auto">
      <div className="container mx-auto max-w-7xl">
        <h2 className="text-4xl font-bold text-primary text-center mb-12">GitHub Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Development Activity Card */}
          <div className="card-glass rounded-xl p-6 hover:border-hover transition-all duration-300">
            <div className="flex items-center mb-4">
              <Activity className="h-6 w-6 text-status-warning mr-3" />
              <h3 className="text-lg font-semibold text-primary">Development Activity</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-primary">{data.activity.recentEvents}</div>
                <div className="text-sm text-muted">Events in last 30 days</div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Daily average:</span>
                <span className="font-medium text-secondary">{dailyAverage}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Last activity:</span>
                <span className="font-medium text-secondary">{lastActivityDate}</span>
              </div>
            </div>
          </div>

          {/* Technical Portfolio Card */}
          <div className="card-glass rounded-xl p-6 hover:border-hover transition-all duration-300">
            <div className="flex items-center mb-4">
              <GitBranch className="h-6 w-6 text-status-warning mr-3" />
              <h3 className="text-lg font-semibold text-primary">Technical Portfolio</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-primary">{data.user.public_repos}</div>
                <div className="text-sm text-muted">Public repositories</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Top languages:</div>
                <div className="flex flex-wrap gap-1">
                  {sortedLanguages.map((lang) => (
                    <span key={lang} className="px-2 py-1 tech-tag rounded text-xs">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Code Quality Card */}
          <div className="card-glass rounded-xl p-6 hover:border-hover transition-all duration-300">
            <div className="flex items-center mb-4">
              <Code className="h-6 w-6 text-status-warning mr-3" />
              <h3 className="text-lg font-semibold text-primary">Code Quality</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-primary">{prReviews}</div>
                <div className="text-sm text-muted">PR reviews completed</div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Pull requests:</span>
                <span className="font-medium text-secondary">{pullRequests}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Commits:</span>
                <span className="font-medium text-secondary">
                  {data.activity.activityTypes.PushEvent || 0}
                </span>
              </div>
            </div>
            <ContributionGraph data={data.contributionGraph} />
          </div>
        </div>
      </div>
    </section>
  );
}
