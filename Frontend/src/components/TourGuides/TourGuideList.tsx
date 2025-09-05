import React from 'react';
import TourGuideCard from './TourGuideCard'; 

interface TourGuide {
  id: string;
  name: string;
  language: string;
  price: string;
  description: string;
  picture: string;
}

interface TourGuideListProps {
  guides: TourGuide[];
}

const TourGuideList: React.FC<TourGuideListProps> = ({ guides }) => {
  if (guides.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p className="text-xl">No tour guides found at the moment.</p>
        <p className="mt-2">Please check back later or apply to be a guide!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-16">
      {guides.map((guide) => (
        <TourGuideCard key={guide.id} guide={guide} />
      ))}
    </div>
  );
};

export default TourGuideList;