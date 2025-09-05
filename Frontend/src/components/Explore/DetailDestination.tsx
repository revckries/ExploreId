'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddToList from '@/components/Explore/AddToList';
import { MapPin, Star, DollarSign, Users, X } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Destination } from '@/app/explore/page'; // Impor Destination dari page.tsx (Explore)

interface Review {
  review: string;
  rating: number;
}

interface DestinationReview {
  place: string;
  reviews: Review[];
}

interface Hotel {
  Name: string;
  Picture: string;
  Category: string;
  Rating: number;
  Address: string;
  Contact: string;
  Price: string;
  Amenities: string;
}

interface DetailDestinationProps {
  place: string;
  destinations: Destination[];
}

const contentVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
};

const imageSlideVariants = {
  hidden: { opacity: 0, x: -100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

const textSlideVariants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

const modalVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalContentVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 25 } },
  exit: { scale: 0.8, opacity: 0 },
};

const normalizeImagePath = (path: string | undefined | null): string => {
  if (typeof path !== 'string' || path.trim() === '') {
    return '/placeholder.jpg';
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('./public')) {
    return path.replace('./public', '');
  }

  if (path.startsWith('//')) {
    return '/' + path.substring(2);
  }

  if (!path.startsWith('/')) {
    return '/' + path;
  }

  return path;
};

const DetailDestination: React.FC<DetailDestinationProps> = ({ place, destinations }) => {
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (place) {
      const matched = destinations.find((item) => item.Place === place);
      setDestination(matched || null);
    }
  }, [place, destinations]);

  useEffect(() => {
    const fetchReviewsAndHotels = async () => {
      try {
        const resReviews = await fetch('/dataset/destinationReview.json');
        if (!resReviews.ok) throw new Error(`HTTP error! status: ${resReviews.status}`);
        const allReviewsData: DestinationReview[] = await resReviews.json();
        const matchedReviews = allReviewsData.find((item) => item.place === place);

        if (matchedReviews) {
          setReviews(matchedReviews.reviews);
          const avg =
            matchedReviews.reviews.reduce((acc, cur) => acc + cur.rating, 0) / matchedReviews.reviews.length;
          setAverageRating(parseFloat(avg.toFixed(2)));
        } else {
          setReviews([]);
          setAverageRating(null);
        }
      } catch (error) {
        console.error('Error loading reviews from local JSON:', error);
        setReviews([]);
        setAverageRating(null);
      }

      if (!destination) return;

      try {
        const resHotels = await fetch('/dataset/hotelsBali.json');
        if (!resHotels.ok) throw new Error(`HTTP error! status: ${resHotels.status}`);
        const allHotelsData: Hotel[] = await resHotels.json();

        const destinationLocationKeywords = destination.Location.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        let nearbyHotels = allHotelsData.filter(hotel => {
          if (!hotel.Address) return false;
          const hotelAddressLower = hotel.Address.toLowerCase();
          return destinationLocationKeywords.some(keyword => hotelAddressLower.includes(keyword));
        });

        if (nearbyHotels.length === 0) {
          console.warn(`No specific hotels found for ${destination.Place} based on local JSON location. Displaying top-rated hotels as fallback.`);
          nearbyHotels = allHotelsData.sort((a, b) => (b.Rating || 0) - (a.Rating || 0)).slice(0, 8);
        } else {
          nearbyHotels = nearbyHotels.slice(0, 8);
        }

        setHotels(nearbyHotels);
      } catch (error) {
        console.error('Error loading hotels from local JSON:', error);
        setHotels([]);
      }
    };

    fetchReviewsAndHotels();
  }, [place, destination]);

  useEffect(() => {
    if (showImageModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  if (!destination) {
    return (
      <div className="min-h-screen bg-[#060c20] text-white flex items-center justify-center">
        <p className="text-blue-300 text-lg">Loading or destination not found...</p>
      </div>
    );
  }

  const getGoogleMapsUrl = (source: string) => {
    return source || '#';
  };

  const displayImageUrl = normalizeImagePath(destination?.Picture);
  const imageAlt = destination?.Place?.toString() || 'Destination image';

  const handleSearchTourGuideClick = () => {
    router.push('/tour-guides'); // This will redirect to the /tour-guide page
  };

  return (
    <div className="min-h-screen bg-[#060c20] text-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-blue-400 hover:underline transition"
        >
          ← Back to Explore
        </button>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start mb-12 md:mb-16"
          initial="hidden"
          animate="visible"
          variants={contentVariants}
        >
          <motion.div
            className="rounded-2xl overflow-hidden shadow-lg md:order-1"
            variants={imageSlideVariants}
          >
            <div className="relative w-full h-80 md:h-[400px] cursor-pointer" onClick={() => setShowImageModal(true)}>
              <Image
                src={displayImageUrl}
                alt={imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
                onError={(e) => { e.currentTarget.src = '/placeholder-image.jpg'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#081827]/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 z-10">
                <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-md mb-1 text-white">
                  {destination.Place}
                </h1>
                <p className="text-md text-blue-200">{destination.Location}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-[#0e253b] border border-[#1e3b57] p-6 md:p-8 rounded-2xl shadow-xl flex flex-col h-full md:order-2"
            variants={textSlideVariants}
          >
            <h2 className="text-2xl font-semibold text-blue-300 mb-4">About this Destination</h2>

            <p className="text-blue-100 leading-relaxed text-md mb-4">
              Welcome to <span className="font-semibold text-white">{destination.Place}</span>, located in{' '}
              <span className="text-white">{destination.Location}</span>. {destination.Description || 'This destination offers unique attractions and breathtaking views that make it a must-visit spot in Bali.'}
            </p>

            <div className="grid grid-cols-[20px_130px_1fr] gap-x-2 gap-y-2 mb-4 text-blue-100 items-start">
              <div className="col-span-1 flex items-start h-full pt-1 justify-center">
                <DollarSign size={20} className="text-blue-400 flex-shrink-0" />
              </div>
              <span className="font-semibold text-white text-left pt-1">Visitor Fee:</span>
              <span className="text-blue-400 font-medium pt-1 whitespace-normal">
                {destination['Tourism/Visitor Fee (approx in USD)'] || 'N/A'}
              </span>

              <div className="col-span-1 flex items-start h-full pt-1 justify-center">
                <MapPin size={20} className="text-blue-400 flex-shrink-0" />
              </div>
              <span className="font-semibold text-white text-left pt-1">Location:</span>
              <a
                href={getGoogleMapsUrl(destination.Source)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-100 hover:text-blue-300 transition block leading-tight pt-1 group"
              >
                <span className="hover:underline">{destination.Location}</span>
                <span className="ml-2 text-xs text-gray-400 group-hover:text-blue-300">(View on Map)</span>
              </a>

              <div className="flex items-center col-span-1 justify-center">
                <Star size={20} className="text-yellow-400 flex-shrink-0" />
              </div>
              <span className="font-semibold text-white text-left">Google Rating:</span>
              <span className="text-yellow-400 font-medium">
                {destination['Google Maps Rating'] ? `${destination['Google Maps Rating']} / 5` : 'N/A'}
              </span>

              <div className="flex items-center col-span-1 justify-center">
                <Users size={20} className="text-green-400 flex-shrink-0" />
              </div>
              <span className="font-semibold text-white text-left">Reviews Count:</span>
              <span className="text-green-300 font-medium">
                {destination['Google Reviews (Count)'] || 0} Reviews
              </span>
            </div>

            <div className="border-t border-[#1e3b57] w-full mt-4"></div>

            <div className="w-full mt-2 flex flex-col sm:flex-row gap-4">
              <AddToList destination={destination} />
              <button
                onClick={handleSearchTourGuideClick}
                // Applied similar styling to AddToList button
                className="mt-4 px-6 py-2 rounded-lg font-semibold transition-all duration-300 ease-in-out transform bg-blue-600 text-white hover:bg-blue-700"
              >
                Search Tour Guide
              </button>
            </div>
          </motion.div>
        </motion.div>

        {reviews.length > 0 && (
          <div className="mt-12 md:mt-16">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-semibold text-blue-300">Visitor Reviews</h2>
              {averageRating !== null && (
                <span className="text-yellow-400 text-base font-medium">⭐ {averageRating.toFixed(2)} / 5</span>
              )}
            </div>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
              {reviews.map((r, index) => (
                <div
                  key={index}
                  className="min-w-[280px] max-w-[280px] flex-shrink-0 bg-[#102d46] border border-[#1e3b57] rounded-xl p-5 snap-center shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center mb-3">
                      <span className="text-yellow-400 font-bold mr-2">{r.rating.toFixed(1)}</span>
                      <span className="text-sm text-blue-200">/ 5</span>
                    </div>
                    <p className="text-blue-100 text-sm leading-relaxed">{r.review}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hotels.length > 0 && (
          <div className="mt-12 md:mt-16 mb-12 md:mb-16">
            <h2 className="text-2xl font-semibold text-blue-300 mb-6">Recommended Hotels Nearby</h2>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
              {hotels.map((hotel, index) => {
                const hotelDisplayImageUrl = normalizeImagePath(hotel.Picture);

                return (
                  <div key={index} className="min-w-[260px] max-w-[260px] h-[360px] flex-shrink-0 flex flex-col bg-[#102d46] border border-[#1e3b57] rounded-xl p-5 snap-center shadow-md">
                    <div className="relative w-full h-40 rounded-md overflow-hidden mb-3">
                      <Image
                        src={hotelDisplayImageUrl}
                        alt={hotel.Name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
                        onError={(e) => { e.currentTarget.src = '/placeholder-hotel.jpg'; }}
                      />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-1 line-clamp-2">{hotel.Name}</h4>
                    <p className="text-blue-200 text-sm mb-1">{hotel.Category}</p>
                    <p className="text-yellow-400 text-sm font-medium mb-2">⭐ {hotel.Rating} / 5</p>

                    <p className="text-blue-400 text-sm mt-auto">{hotel.Price ? hotel.Price.replace('Â', '') : 'Price not available'}</p>
                    <p className="text-blue-100 text-xs mt-1 leading-tight line-clamp-2">{hotel.Amenities}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showImageModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999]"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] w-full h-full bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center"
              variants={modalContentVariants}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={displayImageUrl}
                alt={imageAlt}
                fill
                className="object-contain"
                sizes="100vw"
              />
              <button
                className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition"
                onClick={() => setShowImageModal(false)}
              >
                <X size={32} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailDestination;