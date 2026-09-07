import { useParams } from "react-router";

const CommunityPage = () => {
  const { communityName } = useParams<{ communityName: string }>();

  return (
    <div className="flex-1">
      <h1 className="text-2xl font-medium">r/{communityName}</h1>
    </div>
  );
};

export { CommunityPage };
