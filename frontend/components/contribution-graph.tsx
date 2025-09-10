interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

interface ContributionGraphProps {
  data: Record<string, ContributionDay>;
}

export default function ContributionGraph({ data }: ContributionGraphProps) {
  // Use all data (already filtered to 91 days in the script)
  const recentDays = Object.values(data).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  console.log('ContributionGraph DEBUG:', {
    totalDays: recentDays.length,
    activeDays: recentDays.filter((d) => d.level > 0).length,
    dateRange: `${recentDays[0]?.date} to ${recentDays[recentDays.length - 1]?.date}`,
    firstFew: recentDays.slice(0, 3),
    lastFew: recentDays.slice(-3),
    activeDaysDetails: recentDays.filter((d) => d.level > 0)
  });

  // Get level colors (GitHub-style)
  const getLevelColor = (level: number) => {
    const colors = [
      'bg-gray-800 border-gray-700', // Level 0 - no activity
      'bg-green-400 border-green-300', // Level 1 - low activity
      'bg-green-300 border-green-200', // Level 2 - medium activity
      'bg-green-200 border-green-100', // Level 3 - high activity
      'bg-green-100 border-green-50 shadow-lg shadow-green-200' // Level 4 - very high activity
    ];
    return colors[level] || colors[0];
  };

  // Group days into weeks (7 days each)
  const weeks = [];
  for (let i = 0; i < recentDays.length; i += 7) {
    weeks.push(recentDays.slice(i, i + 7));
  }

  if (recentDays.length === 0) {
    return <div className="text-muted text-sm">No recent contribution data available</div>;
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-secondary mb-3">Contribution Activity</h4>
      <div className="flex gap-1 overflow-x-auto p-2 bg-gray-800 rounded">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)} hover:ring-1 hover:ring-status-warning transition-all border cursor-pointer`}
                title={`${day.date}: ${day.count} commits (level ${day.level})`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted mt-2">
        <span className="text-green-400">●</span> {recentDays.filter((d) => d.level > 0).length}{' '}
        active days in last 13 weeks
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-muted">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`w-3 h-3 rounded-sm ${getLevelColor(level)}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
