import os
import sys
import logging
from pathlib import Path

# Add project root to sys.path so script can be run standalone
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import bcrypt
import requests
from backend.app.config import PEXELS_API_KEY, DB_PATH
from backend.app.database import engine, Base, SessionLocal
from backend.app.models.user import User
from backend.app.models.hotel import Hotel, HotelImage
from backend.app.models.room import Room
from backend.app.models.booking import Booking

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def get_hotel_images(city: str, hotel_name: str, count: int = 4) -> list[str]:
    """
    Fetch high quality images.
    If PEXELS_API_KEY is available, we query Pexels API for real travel images.
    Otherwise, we fall back to picsum.photos with a stable seed derived from the hotel name.
    Stable seeds ensure consistent images across reloads without broken links.
    """
    slug = hotel_name.lower().replace(" ", "-").replace("'", "")
    
    if PEXELS_API_KEY:
        try:
            query = f"{city} hotel resort interior"
            url = f"https://api.pexels.com/v1/search?query={query}&per_page={count}&orientation=landscape"
            headers = {"Authorization": PEXELS_API_KEY}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                photos = data.get("photos", [])
                if photos and len(photos) >= count:
                    return [p["src"]["large"] for p in photos[:count]]
            logger.warning(
                f"Pexels API responded with status {response.status_code} for query '{query}'. Falling back to picsum."
            )
        except Exception as exc:
            logger.warning(f"Failed to fetch images from Pexels API: {exc}. Falling back to picsum.")
    else:
        logger.info(
            "PEXELS_API_KEY is not set. Using stable placeholder images from picsum.photos."
        )

    # Deterministic fallback URLs using picsum.photos seed
    return [
        f"https://picsum.photos/seed/{slug}-{idx}/800/500"
        for idx in range(1, count + 1)
    ]


CITIES_HOTEL_DATA = [
    {
        "city": "Goa",
        "hotels": [
            {
                "name": "Sol De Goa Beach Resort",
                "address": "Candolim Beach Road, North Goa, 403515",
                "star_rating": 4.6,
                "description": "Nestled near the sands of Candolim, Sol De Goa features lush tropical gardens, a sunlit outdoor pool, and private cabanas with coastal dining.",
                "amenities": "Free WiFi, Swimming Pool, Beach Access, Spa, Multi-Cuisine Restaurant, Bar, AC, Room Service",
                "rooms": [
                    {
                        "room_type": "Deluxe Garden View",
                        "description": "Spacious room with king bed, garden balcony, and modern bathroom with rainfall shower.",
                        "price_per_night": 4200.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Ocean Breeze Suite",
                        "description": "Premium suite with ocean-facing balcony, separate living area, and complimentary minibar.",
                        "price_per_night": 7500.0,
                        "capacity": 3,
                        "total_rooms": 3,
                    },
                    {
                        "room_type": "Private Villa with Plunge Pool",
                        "description": "Exclusive private villa featuring its own outdoor plunge pool, sun loungers, and butler service.",
                        "price_per_night": 14500.0,
                        "capacity": 4,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Candolim Sands Retreat",
                "address": "Fort Aguada Road, Candolim, Goa, 403515",
                "star_rating": 4.3,
                "description": "Charming boutique hotel located within walking distance of the beach and lively night markets.",
                "amenities": "Free WiFi, Swimming Pool, Restaurant, Bar, AC, Free Parking",
                "rooms": [
                    {
                        "room_type": "Superior Double Room",
                        "description": "Comfortable room with twin or king bed, work desk, and balcony.",
                        "price_per_night": 3200.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Executive Pool View",
                        "description": "Well-appointed room with views overlooking the central pool.",
                        "price_per_night": 4800.0,
                        "capacity": 2,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Mandovi Heritage Manor",
                "address": "Ribandar Riverfront, Panaji, Goa, 403006",
                "star_rating": 4.5,
                "description": "Restored Portuguese manor overlooking the Mandovi River, combining colonial architecture with contemporary luxury.",
                "amenities": "Free WiFi, Riverfront Terrace, Heritage Dining, Bar, AC, Valet Parking",
                "rooms": [
                    {
                        "room_type": "Colonial Heritage Room",
                        "description": "High ceilings, antique teak wood furniture, and modern ensuite comforts.",
                        "price_per_night": 5100.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Governor River Suite",
                        "description": "Expansive suite with panoramic river views, clawfoot tub, and private patio.",
                        "price_per_night": 8900.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Calangute Palms Haven",
                "address": "Holiday Street, Calangute, Goa, 403516",
                "star_rating": 4.1,
                "description": "Vibrant property situated amidst swaying palms, ideal for leisure travelers and families.",
                "amenities": "Free WiFi, Pool, Children Play Area, Restaurant, AC, Tour Desk",
                "rooms": [
                    {
                        "room_type": "Standard Palm Room",
                        "description": "Cozy room with queen bed, tea coffee maker, and modern bathroom.",
                        "price_per_night": 2800.0,
                        "capacity": 2,
                        "total_rooms": 6,
                    },
                    {
                        "room_type": "Family Palm Suite",
                        "description": "Two connected rooms suitable for families, with two queen beds and kitchenette.",
                        "price_per_night": 5600.0,
                        "capacity": 4,
                        "total_rooms": 3,
                    },
                ],
            },
        ],
    },
    {
        "city": "Jaipur",
        "hotels": [
            {
                "name": "Haveli Royale Palace",
                "address": "Amer Road, Near Jal Mahal, Jaipur, 302002",
                "star_rating": 4.8,
                "description": "Traditional Rajasthani palace property showcasing grand arches, hand-painted murals, and royal courtyards.",
                "amenities": "Free WiFi, Courtyard Pool, Royal Spa, Rooftop Dining, AC, Valet Parking, Cultural Evenings",
                "rooms": [
                    {
                        "room_type": "Royal Deluxe Room",
                        "description": "Ornate furnishings, marble floors, and modern bathroom amenities.",
                        "price_per_night": 5500.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Maharaja Heritage Suite",
                        "description": "Grand suite with four-poster bed, sitting room, and courtyard terrace.",
                        "price_per_night": 11500.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Pink City Grand Heritage",
                "address": "Station Road, Gopalbari, Jaipur, 302001",
                "star_rating": 4.4,
                "description": "Central hotel offering modern comfort and swift access to Hawa Mahal, City Palace, and local bazaars.",
                "amenities": "Free WiFi, Fitness Center, Restaurant, Bar, AC, Business Center",
                "rooms": [
                    {
                        "room_type": "Deluxe City Room",
                        "description": "Contemporary decor with king bed, flat-screen TV, and ergonomic workstation.",
                        "price_per_night": 3400.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Executive Suite",
                        "description": "Spacious suite with king bed and separate living lounge.",
                        "price_per_night": 6200.0,
                        "capacity": 3,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Amber Fort View Hotel",
                "address": "Delhi-Jaipur Highway, Amer, Jaipur, 302028",
                "star_rating": 4.6,
                "description": "Scenic property located directly facing the majestic Amber Fort with nighttime illuminated views.",
                "amenities": "Free WiFi, Swimming Pool, Rooftop Fort-View Restaurant, AC, Free Parking",
                "rooms": [
                    {
                        "room_type": "Fort View Superior",
                        "description": "Uninterrupted view of Amer Fort from your bed and private balcony.",
                        "price_per_night": 4600.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Royal Fort Balcony Suite",
                        "description": "Large private balcony directly facing Amber Fort, with artisan stone bath.",
                        "price_per_night": 8800.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Johari Bazaar Boutique Hotel",
                "address": "Johari Bazaar, Old City, Jaipur, 302003",
                "star_rating": 4.2,
                "description": "Intimate boutique hotel in the heart of the walled Pink City, surrounded by artisan jewelry and textile shops.",
                "amenities": "Free WiFi, Rooftop Cafe, AC, Airport Shuttle, Heritage Walks",
                "rooms": [
                    {
                        "room_type": "Classic Bazaar Room",
                        "description": "Warm decor featuring local block prints, queen bed, and rainfall shower.",
                        "price_per_night": 2900.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Artisan Balcony Room",
                        "description": "Private balcony overlooking the heritage streets of Jaipur.",
                        "price_per_night": 4400.0,
                        "capacity": 2,
                        "total_rooms": 3,
                    },
                ],
            },
        ],
    },
    {
        "city": "Manali",
        "hotels": [
            {
                "name": "Snow Crest Alpine Resort",
                "address": "Log Huts Area, Old Manali, 175131",
                "star_rating": 4.7,
                "description": "Alpine haven situated among cedar forests with sweeping vistas of snow-capped Himalayan peaks.",
                "amenities": "Free WiFi, Bonfire, Lawn Garden, Multi-Cuisine Restaurant, Heated Rooms, Mountain Guides",
                "rooms": [
                    {
                        "room_type": "Cedar Deluxe Room",
                        "description": "Wood-paneled room with king bed, heated blankets, and mountain panoramas.",
                        "price_per_night": 3800.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Himalayan View Suite",
                        "description": "Corner suite with floor-to-ceiling windows, private fireplace, and balcony.",
                        "price_per_night": 7200.0,
                        "capacity": 3,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Solang Valley Pine Lodge",
                "address": "Solang Valley Road, Manali, 175103",
                "star_rating": 4.5,
                "description": "Mountain lodge located adjacent to adventure trails and ski slopes, surrounded by dense pine groves.",
                "amenities": "Free WiFi, Ski Equipment Storage, Barbecue Facilities, Cafe, Heating, Parking",
                "rooms": [
                    {
                        "room_type": "Pine Standard Room",
                        "description": "Cozy timber room with queen bed and pine forest view.",
                        "price_per_night": 3100.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Valley Panorama Room",
                        "description": "Spacious room with uninterrupted Solang Valley view and balcony.",
                        "price_per_night": 5300.0,
                        "capacity": 3,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Beas Riverfront Retreat",
                "address": "Naggar Road, Aleo, Manali, 175131",
                "star_rating": 4.4,
                "description": "Tranquil property built right on the banks of the roaring River Beas, offering soothing water sounds.",
                "amenities": "Free WiFi, River Terrace, Riverside Dining, Spa, Heating, Free Parking",
                "rooms": [
                    {
                        "room_type": "Riverside Deluxe",
                        "description": "Room with private balcony opening directly over the Beas river rapids.",
                        "price_per_night": 3600.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Riverside Wooden Cottage",
                        "description": "Private duplex wooden cottage right along the river bank.",
                        "price_per_night": 7900.0,
                        "capacity": 4,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Rohtang Mountain Suites",
                "address": "Prini Village, Manali, 175143",
                "star_rating": 4.3,
                "description": "Quiet retreat situated in serene Prini village with panoramic views of the Pir Panjal mountain range.",
                "amenities": "Free WiFi, Garden, Restaurant, Apple Orchard Walks, Heating, Parking",
                "rooms": [
                    {
                        "room_type": "Orchard Classic Room",
                        "description": "Comfortable room facing the family apple orchards and pine cliffs.",
                        "price_per_night": 2700.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Pir Panjal Suite",
                        "description": "Top-floor suite with expansive sun deck and panoramic mountain views.",
                        "price_per_night": 5100.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
        ],
    },
    {
        "city": "Kerala",
        "hotels": [
            {
                "name": "Vembanad Backwaters Luxury Resort",
                "address": "Muhamma, Kumarakom, Kerala, 688525",
                "star_rating": 4.9,
                "description": "Sprawling lakefront sanctuary set along the calm waters of Vembanad Lake, featuring traditional Keralan architecture.",
                "amenities": "Free WiFi, Infinity Pool, Ayurvedic Spa, Houseboat Cruises, Keralan Seafood Dining, AC",
                "rooms": [
                    {
                        "room_type": "Heritage Lake View Room",
                        "description": "Spacious room built with terracotta tiles, teak woodwork, and serene lake views.",
                        "price_per_night": 6800.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Private Pool Water Villa",
                        "description": "Exclusive villa positioned on the water with personal plunge pool and daybed.",
                        "price_per_night": 16500.0,
                        "capacity": 2,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Munnar Tea Plantation Villa",
                "address": "Pallivasal Estate, Munnar, Kerala, 685565",
                "star_rating": 4.7,
                "description": "Perched amidst rolling green tea gardens, offering crisp mountain air, plantation trails, and mist-filled valleys.",
                "amenities": "Free WiFi, Tea Tasting Sessions, Nature Walks, Multi-Cuisine Restaurant, Fireplace",
                "rooms": [
                    {
                        "room_type": "Tea Estate Deluxe Room",
                        "description": "Large picture windows looking directly into emerald tea hills.",
                        "price_per_night": 4500.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Misty Valley Chalet",
                        "description": "Chalet-style suite with private wooden deck and panoramic valley views.",
                        "price_per_night": 7800.0,
                        "capacity": 3,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Kovalam Cliff Coastal Stay",
                "address": "Lighthouse Beach, Kovalam, Kerala, 695521",
                "star_rating": 4.4,
                "description": "Cliff-top resort with direct ocean panoramas, sunset viewing decks, and access to the Arabian Sea shore.",
                "amenities": "Free WiFi, Cliff Pool, Seafood Restaurant, Beach Path, Spa, AC",
                "rooms": [
                    {
                        "room_type": "Cliff View Deluxe",
                        "description": "Air-conditioned room with king bed and balcony directly facing the Arabian Sea.",
                        "price_per_night": 3900.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Sunset Ocean Suite",
                        "description": "Corner suite with double balconies and uninterrupted sunset horizons.",
                        "price_per_night": 6900.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Alleppey Houseboat Inn",
                "address": "Finishing Point Road, Alappuzha, Kerala, 688013",
                "star_rating": 4.5,
                "description": "Backwater retreat and docking port for traditional kettuvallam houseboats cruising the palm-lined canals.",
                "amenities": "Free WiFi, Canal Cruise Bookings, Fresh Catch Dining, AC, Tour Desk",
                "rooms": [
                    {
                        "room_type": "Canal View Room",
                        "description": "Comfortable room facing the busy waterways with passing houseboats.",
                        "price_per_night": 3200.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Floating Houseboat Suite",
                        "description": "Full private suite aboard a moored wooden houseboat with personal sundeck.",
                        "price_per_night": 9500.0,
                        "capacity": 2,
                        "total_rooms": 2,
                    },
                ],
            },
        ],
    },
    {
        "city": "Mumbai",
        "hotels": [
            {
                "name": "Marine Drive Grand Hotel",
                "address": "Marine Drive, Churchgate, Mumbai, 400020",
                "star_rating": 4.8,
                "description": "Iconic art deco property positioned directly across the Queen's Necklace promenade with sweeping Arabian Sea views.",
                "amenities": "Free WiFi, Rooftop Pool, Sea View Dining, Fitness Studio, AC, Valet Parking",
                "rooms": [
                    {
                        "room_type": "City Deluxe King",
                        "description": "Smart business room with king bed, marble bathroom, and high-speed workstation.",
                        "price_per_night": 6500.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Queen Necklace Sea Suite",
                        "description": "High floor suite offering floor-to-ceiling views across Marine Drive and the bay.",
                        "price_per_night": 14000.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Bandra Sea Breeze Suites",
                "address": "Carter Road, Bandra West, Mumbai, 400050",
                "star_rating": 4.5,
                "description": "Modern boutique suites in vibrant Bandra, surrounded by trendy cafes, designer boutiques, and seaside boardwalks.",
                "amenities": "Free WiFi, Rooftop Cafe, Fitness Center, AC, Concierge, Laundry Service",
                "rooms": [
                    {
                        "room_type": "Studio Deluxe Room",
                        "description": "Contemporary studio with king bed, workspace, and ensuite rain shower.",
                        "price_per_night": 4900.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Bandra Skyline Suite",
                        "description": "Generous suite with balcony facing the Bandra coastline.",
                        "price_per_night": 8200.0,
                        "capacity": 2,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Colaba Heritage Residence",
                "address": "Arthur Bunder Road, Colaba, Mumbai, 400005",
                "star_rating": 4.4,
                "description": "Historic charm situated steps from the Gateway of India, art galleries, and historic dining institutions.",
                "amenities": "Free WiFi, Heritage Lounge, Cafe, AC, Travel Desk, Express Check-in",
                "rooms": [
                    {
                        "room_type": "Victorian Classic Room",
                        "description": "Vintage wooden flooring, high ceilings, and plush modern bedding.",
                        "price_per_night": 4100.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Heritage Colonial Suite",
                        "description": "Spacious suite with heritage sitting room and antique brass accents.",
                        "price_per_night": 7600.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Juhu Beachfront Hotel",
                "address": "Juhu Tara Road, Juhu, Mumbai, 400049",
                "star_rating": 4.6,
                "description": "Beachfront oasis offering serene palm courtyards, direct beach access, and international dining options.",
                "amenities": "Free WiFi, Swimming Pool, Beachfront Lawn, Spa, AC, Valet Parking",
                "rooms": [
                    {
                        "room_type": "Superior Garden Room",
                        "description": "Relaxing room looking onto tropical hotel gardens.",
                        "price_per_night": 5200.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Arabian Oceanfront Suite",
                        "description": "Direct ocean views, spacious balcony, and luxurious soaking tub.",
                        "price_per_night": 11200.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
        ],
    },
    {
        "city": "Delhi",
        "hotels": [
            {
                "name": "Connaught Central Grand",
                "address": "Barakhamba Road, Connaught Place, New Delhi, 110001",
                "star_rating": 4.7,
                "description": "Prime location in Connaught Place, combining colonial grandeur with top-tier executive luxury and dining.",
                "amenities": "Free WiFi, Swimming Pool, Fitness Center, 3 Restaurants, AC, Valet Parking, Metro Proximity",
                "rooms": [
                    {
                        "room_type": "Executive King Room",
                        "description": "Soundproofed room with king bed, ergonomic desk, and marble bath.",
                        "price_per_night": 5800.0,
                        "capacity": 2,
                        "total_rooms": 6,
                    },
                    {
                        "room_type": "Diplomatic Club Suite",
                        "description": "Expansive suite with lounge access, boardroom privileges, and complimentary breakfast.",
                        "price_per_night": 12800.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Lutyens Garden Hotel",
                "address": "Janpath Lane, New Delhi, 110001",
                "star_rating": 4.6,
                "description": "Peaceful garden retreat nestled inside central New Delhi's wide green boulevards and diplomatic avenues.",
                "amenities": "Free WiFi, Landscaped Gardens, Tea Lounge, Fine Dining, AC, Free Parking",
                "rooms": [
                    {
                        "room_type": "Garden Deluxe Room",
                        "description": "Elegant room with direct vistas of manicured lawns.",
                        "price_per_night": 4900.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Lutyens Estate Suite",
                        "description": "Opulent suite with private courtyard, parlor, and personalized service.",
                        "price_per_night": 9800.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Old Delhi Heritage Haveli",
                "address": "Chandni Chowk, Old Delhi, 110006",
                "star_rating": 4.3,
                "description": "Meticulously restored Mughal-era mansion providing an authentic culinary and cultural journey through old Shahjahanabad.",
                "amenities": "Free WiFi, Rooftop View of Jama Masjid, Traditional Kitchen, AC, Guided Walking Tours",
                "rooms": [
                    {
                        "room_type": "Jharokha Heritage Room",
                        "description": "Carved sandstone lattice windows, handcrafted brass fittings, and modern ensuite.",
                        "price_per_night": 3500.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Mughal Courtyard Suite",
                        "description": "Spacious suite surrounding the fountain courtyard with traditional bolsters and rugs.",
                        "price_per_night": 6800.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Aerocity Transit Suites",
                "address": "Hospitality District, Aerocity, New Delhi, 110037",
                "star_rating": 4.5,
                "description": "Modern soundproof hotel located minutes from Indira Gandhi International Airport, ideal for business and stopovers.",
                "amenities": "Free WiFi, 24/7 Buffet Restaurant, Soundproof Glass, Gym, AC, Airport Shuttle",
                "rooms": [
                    {
                        "room_type": "Soundproof Transit King",
                        "description": "Ultra quiet room with blackout curtains, power shower, and king bed.",
                        "price_per_night": 4600.0,
                        "capacity": 2,
                        "total_rooms": 6,
                    },
                    {
                        "room_type": "Executive Airport Suite",
                        "description": "Full business suite with lounge and quick airport priority check-in.",
                        "price_per_night": 7900.0,
                        "capacity": 3,
                        "total_rooms": 3,
                    },
                ],
            },
        ],
    },
    {
        "city": "Udaipur",
        "hotels": [
            {
                "name": "Lake Pichola Palace Hotel",
                "address": "Pichola Waterfront, Udaipur, 313001",
                "star_rating": 4.9,
                "description": "Unrivaled luxury on the edge of Lake Pichola with majestic views of Jag Mandir and the City Palace.",
                "amenities": "Free WiFi, Lakefront Swimming Pool, Royal Dining, Boat Transfers, Spa, AC, Valet Parking",
                "rooms": [
                    {
                        "room_type": "Palace Lake View Deluxe",
                        "description": "Opulent room featuring traditional jharokha seating with unbroken lake views.",
                        "price_per_night": 7800.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Maharana Grand Lakefront Suite",
                        "description": "Regal suite with handcrafted gold leaf details, private terrace, and whirlpool tub.",
                        "price_per_night": 18500.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Fateh Sagar Courtyard",
                "address": "Rani Road, Fateh Sagar Lake, Udaipur, 313004",
                "star_rating": 4.5,
                "description": "Serene lakeside property set against the backdrop of the Aravalli hills on the shores of Fateh Sagar.",
                "amenities": "Free WiFi, Lake Terrace, Swimming Pool, Multi-Cuisine Restaurant, AC, Parking",
                "rooms": [
                    {
                        "room_type": "Lake View Premier Room",
                        "description": "Modern room with panoramic glass balcony overlooking Fateh Sagar Lake.",
                        "price_per_night": 4400.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Aravalli Horizon Suite",
                        "description": "Suite featuring corner views of hills and lake, with deep soaking tub.",
                        "price_per_night": 8400.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Jagdish Temple Heritage Inn",
                "address": "Near Jagdish Temple, Lal Ghat, Udaipur, 313001",
                "star_rating": 4.2,
                "description": "Atmospheric heritage stay in the lively old quarter, steps from ghats, temples, and artisan cafes.",
                "amenities": "Free WiFi, Rooftop Cafe, AC, Travel Desk, Yoga Sessions",
                "rooms": [
                    {
                        "room_type": "Heritage Standard Room",
                        "description": "Carved wood accents, traditional Rajasthani textiles, and modern shower.",
                        "price_per_night": 2500.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Rooftop Ghat View Room",
                        "description": "Room on the upper terrace with views over the ghats and Lake Pichola.",
                        "price_per_night": 4200.0,
                        "capacity": 2,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Aravalli Hills Royal Resort",
                "address": "Badi Lake Road, Udaipur, 313011",
                "star_rating": 4.7,
                "description": "Sprawling hillside resort offering tranquility away from town, with mountain-ringed gardens and bird watching.",
                "amenities": "Free WiFi, Infinity Mountain Pool, Wellness Spa, Cycling Trails, AC, Free Parking",
                "rooms": [
                    {
                        "room_type": "Mountain Vista Room",
                        "description": "Comfortable room with sunlit balcony facing rugged Aravalli ridgelines.",
                        "price_per_night": 4900.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Royal Garden Cottage",
                        "description": "Standalone stone cottage with private lawn and outdoor sitting verandah.",
                        "price_per_night": 9200.0,
                        "capacity": 4,
                        "total_rooms": 2,
                    },
                ],
            },
        ],
    },
    {
        "city": "Rishikesh",
        "hotels": [
            {
                "name": "Ganga Riverfront Spiritual Retreat",
                "address": "Tapovan, Rishikesh, Uttarakhand, 249192",
                "star_rating": 4.8,
                "description": "Serene riverside haven directly overlooking the crystal green waters of the holy Ganges with private ghat access.",
                "amenities": "Free WiFi, Private Ghat Access, Yoga Pavilion, Ayurvedic Spa, Pure Vegetarian Restaurant, AC",
                "rooms": [
                    {
                        "room_type": "Ganga View Deluxe",
                        "description": "Private balcony facing the sacred river rapids and evening breeze.",
                        "price_per_night": 4200.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Himalayan Ganga Suite",
                        "description": "Large suite with meditation corner, deep tub, and unobstructed river panoramas.",
                        "price_per_night": 8500.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Himalayan Foothills Yoga Resort",
                "address": "Neelkanth Temple Road, Rishikesh, Uttarakhand, 249304",
                "star_rating": 4.6,
                "description": "Peaceful eco-resort nestled in dense sal forests on the Himalayan hillsides above the river valley.",
                "amenities": "Free WiFi, Open Air Yoga Shala, Organic Dining, Forest Trails, Spa, Free Parking",
                "rooms": [
                    {
                        "room_type": "Forest View Room",
                        "description": "Spacious eco-friendly room with timber accents and peaceful forest balcony.",
                        "price_per_night": 3400.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Foothills Panorama Cottage",
                        "description": "Private cottage on the terrace level with wide valley and forested hill views.",
                        "price_per_night": 6600.0,
                        "capacity": 3,
                        "total_rooms": 2,
                    },
                ],
            },
            {
                "name": "Tapovan Serenity Hotel",
                "address": "Badrinath Road, Tapovan, Rishikesh, 249192",
                "star_rating": 4.3,
                "description": "Lively boutique hotel close to Rishikesh cafes, yoga teacher training academies, and white water rafting centers.",
                "amenities": "Free WiFi, Rooftop Cafe, AC, Rafting Bookings, Tour Desk",
                "rooms": [
                    {
                        "room_type": "Serenity Double Room",
                        "description": "Comfortable room with queen bed, ensuite shower, and work desk.",
                        "price_per_night": 2600.0,
                        "capacity": 2,
                        "total_rooms": 5,
                    },
                    {
                        "room_type": "Mountain Balcony Room",
                        "description": "Room with private terrace looking onto the surrounding green peaks.",
                        "price_per_night": 4100.0,
                        "capacity": 2,
                        "total_rooms": 3,
                    },
                ],
            },
            {
                "name": "Laxman Jhula Valley View",
                "address": "Laxman Jhula, Rishikesh, Uttarakhand, 249302",
                "star_rating": 4.4,
                "description": "Iconic location near the historic suspension bridge, featuring rooftop dining with Ganga aarti audio.",
                "amenities": "Free WiFi, Rooftop Restaurant, River View Terrace, AC, Travel Desk",
                "rooms": [
                    {
                        "room_type": "Bridge View Classic",
                        "description": "Cozy room with direct views toward Laxman Jhula bridge and hills.",
                        "price_per_night": 2900.0,
                        "capacity": 2,
                        "total_rooms": 4,
                    },
                    {
                        "room_type": "Riverfront Family Suite",
                        "description": "Connected family suite with two bedrooms and riverfront balcony.",
                        "price_per_night": 5800.0,
                        "capacity": 4,
                        "total_rooms": 2,
                    },
                ],
            },
        ],
    },
]


def seed_database():
    """
    Creates tables if they do not exist and populates initial data:
    - Default admin and regular user accounts.
    - 8 cities, 4 hotels per city (32 total hotels).
    - 2 to 3 room types per hotel.
    - Hotel gallery images with stable fallbacks.
    """
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Users
        existing_admin = db.query(User).filter(User.email == "admin@travel.local").first()
        if not existing_admin:
            admin_user = User(
                name="System Administrator",
                email="admin@travel.local",
                hashed_password=hash_password("admin123"),
                is_admin=True,
            )
            db.add(admin_user)
            logger.info("Created default admin user: admin@travel.local (password: admin123)")

        existing_user = db.query(User).filter(User.email == "demo@travel.local").first()
        if not existing_user:
            demo_user = User(
                name="Demo Traveler",
                email="demo@travel.local",
                hashed_password=hash_password("demo123"),
                is_admin=False,
            )
            db.add(demo_user)
            logger.info("Created default demo user: demo@travel.local (password: demo123)")

        db.commit()

        # 2. Seed Hotels, Images, and Rooms
        hotel_count = db.query(Hotel).count()
        if hotel_count > 0:
            logger.info(f"Database already contains {hotel_count} hotels. Skipping hotel seeding.")
            return

        total_hotels_added = 0
        total_rooms_added = 0
        total_images_added = 0

        for city_group in CITIES_HOTEL_DATA:
            city_name = city_group["city"]
            for h_data in city_group["hotels"]:
                min_price = min(r["price_per_night"] for r in h_data["rooms"])
                hotel = Hotel(
                    name=h_data["name"],
                    city=city_name,
                    address=h_data["address"],
                    star_rating=h_data["star_rating"],
                    description=h_data["description"],
                    amenities=h_data["amenities"],
                    price_per_night_min=min_price,
                )
                db.add(hotel)
                db.flush()  # Flushes to obtain hotel.id
                total_hotels_added += 1

                # Add gallery images (primary + additional angles)
                image_urls = get_hotel_images(city_name, h_data["name"], count=4)
                for idx, img_url in enumerate(image_urls):
                    image = HotelImage(
                        hotel_id=hotel.id,
                        image_url=img_url,
                        caption=f"{h_data['name']} - Photo {idx + 1}",
                        is_primary=(idx == 0),
                    )
                    db.add(image)
                    total_images_added += 1

                # Add room types
                for r_data in h_data["rooms"]:
                    room = Room(
                        hotel_id=hotel.id,
                        room_type=r_data["room_type"],
                        description=r_data["description"],
                        price_per_night=r_data["price_per_night"],
                        capacity=r_data["capacity"],
                        total_rooms=r_data["total_rooms"],
                    )
                    db.add(room)
                    total_rooms_added += 1

        db.commit()
        logger.info(
            f"Seeding completed successfully: {total_hotels_added} hotels, {total_rooms_added} rooms, {total_images_added} images across 8 cities."
        )

    except Exception as exc:
        db.rollback()
        logger.error(f"Error seeding database: {exc}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
