export const SkipLink = ({ label, targetId = 'main' }: { label: string; targetId?: string }) => (
  <a className="drb-skiplink" href={`#${targetId}`}>
    {label}
  </a>
);
