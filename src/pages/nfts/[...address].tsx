import { NextPage, NextPageContext } from "next"
import { AppProps } from 'next/app'
import { gql } from '@apollo/client'
import { isNil } from 'ramda'
import client from '../../client'
import { Link } from 'react-router-dom';
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import NextLink from 'next/link'
import { Route, Routes } from 'react-router-dom'
import Offer from '../../components/Offer';
import SellNft from '../../components/SellNft';
import WalletWithAvatar from '../../components/WalletWithAvatar';

const solSymbol = '◎'
const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN

interface NextPageContextWithParams extends NextPageContext {
  params: any;
}

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'];
  
  const {
    data: { storefront, nft },
  } = await client.query<GetNftPage>({
    query: gql`
      query GetNftPage($subdomain: String!, $address: String!) {
        storefront(subdomain: $subdomain) {
          title
          description
          logoUrl
          faviconUrl
          bannerUrl
          ownerAddress
        }
        nft(address: $address) {
          name
          address
          image
          sellerFeeBasisPoints
          mintAddress
          description
          attributes {
            traitType
            value
          }
        }
      }
    `,
    variables: {
      subdomain: (subdomain || SUBDOMAIN),
      address: (query?.address || [])[0],
    },
  })

  if (isNil(storefront)) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      storefront,
      nft,
    },
  }
}

interface GetNftPage {
  storefront: Storefront | null
  nft: Nft | null
}

interface Storefront {
  title: string
  description: string
  logoUrl: string
  bannerUrl: string
  faviconUrl: string
  subdomain: string
  ownerAddress: string
}

interface NftAttribute {
  value: string
  traitType: string
}

interface Nft {
  name: string
  address: string
  description: string
  image: string
  sellerFeeBasisPoints: number
  mintAddress: string
  attributes: NftAttribute[]
}

interface NftPageProps extends AppProps {
  storefront: Storefront
  nft: Nft
}

const Nft: NextPage<NftPageProps> = ({ storefront, nft }) => {

  const isOwner = false
  const isListed = true
  const hasBeenSold = true
  
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 text-white bg-gray-900/80 backdrop-blur-md grow">
        <NextLink href="/">
          <a>
            <button className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-800 rounded-full align h-14 hover:bg-gray-600">
              <img className="w-8 h-8 rounded-full aspect-square" src={storefront.logoUrl} />
              {storefront.title}
              </button>
          </a>
        </NextLink>
        <WalletMultiButton>Connect</WalletMultiButton>
      </div>
      <div className="container px-4 pb-10 mx-auto text-white">
        <div className="grid grid-cols-1 gap-6 mt-12 mb-10 lg:grid-cols-2 items-start">
          <div className="block mb-4 lg:mb-0 lg:flex lg:items-center lg:justify-center ">
            <div className="block mb-6 lg:hidden">
              <p className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </p>
              <p className="text-lg">{nft.description}</p>
            </div>
            <img
              src={nft.image}
              className="block h-auto max-w-full border-none rounded-lg shadow"
            />
          </div>
          <div className="">
            <div className="hidden lg:block mb-8">
              <p className="mb-4 text-2xl lg:text-4xl md:text-3xl">
                <b>{nft.name}</b>
              </p>
              <p className="text-lg">{nft.description}</p>
            </div>

            {hasBeenSold &&
              <div className="flex-1 mb-8">
                <div className="label mb-1">CREATOR</div>
                <WalletWithAvatar
                  walletAddress={storefront.ownerAddress}
                  avatarUrl={storefront.logoUrl}
                />
              </div>
            }

            <div className="w-full p-6 rounded-lg bg-gray-800 mt-8">
              
              <div className="mb-6 flex">
                {isListed &&
                  <div className="flex-1">
                    <div className="label">PRICE</div>
                    <p className="text-base md:text-xl lg:text-3xl">
                      <b>{solSymbol} 1.5</b>
                    </p>
                  </div>
                }
                {(hasBeenSold && !isListed) &&
                  <div className="flex-1">
                    <div className="label mb-2">LAST PRICE</div>
                    <div className="label icon-sol">5.0</div>
                  </div>
                }
                {(!hasBeenSold && !isListed) &&
                  <div className="flex-1">
                    <div className="label mb-2">MINTED</div>
                    <div className="label">4 days ago</div>
                  </div>
                }
                <div className="flex-1">
                  <div className="label mb-1">{hasBeenSold ? 'OWNER' : 'CREATOR'}</div>
                  <WalletWithAvatar
                    walletAddress={storefront.ownerAddress}
                    avatarUrl={storefront.logoUrl}
                  />
                </div>
              </div>

              <div className="flex gap-4 overflow-visible">
                <Routes>
                  <Route
                    path={`/nfts/${nft.address}`}
                    element={(
                      <>
                        {!isOwner &&
                          <Link to={`/nfts/${nft.address}/offers/new`} className="flex-1 button secondary">Make Offer</Link>
                        }
                        {isOwner &&
                          <Link to={`/nfts/${nft.address}/listings/new`} className="flex-1 button">Sell NFT</Link>
                        }
                        {isListed &&
                          <button className="button flex-1">Buy Now</button>
                        }
                      </>
                    )}
                  />
                  <Route
                    path={`/nfts/${nft.address}/offers/new`}
                    element={<Offer nft={nft} />}
                  />
                  <Route
                    path={`/nfts/${nft.address}/listings/new`}
                    element={<SellNft nft={nft} />}
                  />
                </Routes>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8">
              {nft.attributes.map((a) => (
                <div key={a.traitType} className="p-3 rounded border border-gray-700">
                  <p className="label uppercase">{a.traitType}</p>
                  <p>{a.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        
        <div className="flex justify-between px-4 mt-10 mb-10 text-sm sm:text-base md:text-lg ">
          <div className="w-full">
            <h1 className="text-xl md:text-2xl">
              <b>Offers</b>
            </h1>

            <div className="grid grid-cols-3 p-4 sm:grid-cols-4">
              <div className="label uppercase">FROM</div>
              <div className="label uppercase">PRICE</div>
              <div className="label uppercase">DATE</div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 rounded-lg p-4 mb-4 border border-gray-700">
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div className="icon-sol">75</div>
              <div>3 hours ago</div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4 rounded-lg p-4 mb-4 border border-[#383838]">
              <div>
                <img
                  src="https://arweave.cache.holaplex.com/jCOsXoir5WC8dcxzM-e53XSOL8mAvO0DetErDLSbMRg"
                  className="object-contain rounded-full mr-2 inline-block h-[30px]"
                />
                <span>@skelly</span>
              </div>
              <div className="icon-sol">100</div>
              <div>10 hours ago</div>
            </div>
          </div>
        </div>
        {/* END OF OFFERS SECTION */}
      </div>
    </>
  )
}

export default Nft