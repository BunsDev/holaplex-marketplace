import { useEffect } from 'react'
import next, { NextPage, NextPageContext } from 'next'
import { gql, useQuery } from '@apollo/client'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import { isNil, map, modify, filter, pipe, prop, isEmpty, not, any, equals, ifElse, always } from 'ramda'
import { useRouter } from "next/router";
import { AppProps } from 'next/app'
import Select from 'react-select'
import { useForm, Controller } from 'react-hook-form'
import { truncateAddress } from './../../modules/address';
import client from '../../client'
import { Marketplace, Creator, Nft, PresetNftFilter, AttributeFilter } from './../../types.d';
import { List } from '../../components/List'
import { NftCard } from '../../components/NftCard'
import cx from 'classnames';

const SUBDOMAIN = process.env.MARKETPLACE_SUBDOMAIN;

type OptionType = { label: string; value: number };

interface GetNftsData {
  nfts: Nft[]
  creator: Creator
};

const GET_NFTS = gql`
  query GetNfts($creators: [PublicKey!]!, $attributes: [AttributeFilter!], $owners: [PublicKey!], $listed: [PublicKey!]) {
    nfts(creators: $creators, attributes: $attributes, owners: $owners, listed: $listed) {
      address
      name
      description
      image
      listings {
        address
        auctionHouse
        price
      }
    }
  }
`

export async function getServerSideProps({ req, query }: NextPageContext) {
  const subdomain = req?.headers['x-holaplex-subdomain'];

  const {
    data: { marketplace, creator },
  } = await client.query<GetCreatorPage>({
    query: gql`
      query GetCreatorPage($subdomain: String!, $creator: String!) {
        marketplace(subdomain: $subdomain) {
          subdomain
          name
          description
          logoUrl
          bannerUrl
          ownerAddress
          creators {
            creatorAddress
          }
          auctionHouse {
            address
            treasuryMint
            auctionHouseTreasury
            treasuryWithdrawalDestination
            feeWithdrawalDestination
            authority
            creator
            auctionHouseFeeAccount
            bump
            treasuryBump
            feePayerBump
            sellerFeeBasisPoints
            requiresSignOff
            canChangeSalePrice
          }
        }
        creator(address: $creator) {
          attributeGroups {
            name
            variants {
              name
              count
            }
          }
        }
      }
    `,
    variables: {
      subdomain: (subdomain || SUBDOMAIN),
      creator: query.creator,
    },
  })

  if (any(isNil)([marketplace, creator])) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      marketplace,
      creator,
    },
  }
}

interface GetCreatorPage {
  marketplace: Marketplace | null;
  creator: Creator | null;
}

interface CreatorPageProps extends AppProps {
  marketplace: Marketplace
  creator: Creator
}

interface NftFilterForm {
  attributes: AttributeFilter[];
  preset: PresetNftFilter;
}

const CreatorShow: NextPage<CreatorPageProps> = ({ marketplace, creator }) => {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const nfts = useQuery<GetNftsData>(GET_NFTS, {
    variables: {
      creators: [router.query.creator],
    },
  })

  const { control, watch } = useForm<NftFilterForm>({
    defaultValues: { preset: PresetNftFilter.All }
  });

  useEffect(() => {
    const subscription = watch(({ attributes, preset }) => {
      const pubkey = publicKey?.toBase58();
      const nextAttributes = pipe(
        filter(pipe(prop('values'), isEmpty, not)),
        map(modify('values', map(prop('value'))))
      )(attributes);

      const owners = ifElse(
        equals(PresetNftFilter.Owned),
        always([pubkey]),
        always(null),
      )(preset as PresetNftFilter);

      const listed = ifElse(
        equals(PresetNftFilter.Listed),
        always([marketplace.auctionHouse.address]),
        always(null),
      )(preset as PresetNftFilter);

      nfts.refetch({
        creators: [router.query.creator],
        attributes: nextAttributes,
        owners,
        listed,
      });
    })
    return () => subscription.unsubscribe()
  }, [watch, publicKey, marketplace])

  return (
    <div className='flex flex-col items-center text-white bg-gray-900'>
      <div className='relative w-full'>
        <div className="absolute right-8 top-8">
          <WalletMultiButton>Connect</WalletMultiButton>
        </div>
        <img src={marketplace.bannerUrl} alt={marketplace.name} className='object-cover w-full h-80' />
      </div>
      <div className='w-full max-w-[1800px] px-8'>
        <div className='relative flex flex-col justify-between w-full mt-20 mb-20'>
          <img
            src={marketplace.logoUrl}
            alt={marketplace.name}
            className='absolute border-4 border-gray-900 rounded-full w-28 h-28 -top-32'
          />
          <h1>{marketplace.name}</h1>
          <p className='mt-4 max-w-prose'>{marketplace.description}</p>
        </div>
        <div className='flex'>
          <div className='flex-row flex-none hidden w-80 mr-10 space-y-2 sm:block'>
            <form
              onSubmit={e => {
                e.preventDefault()
              }}
              className='sticky top-0 max-h-screen py-4 overflow-auto'
            >
              <ul className='flex flex-col flex-grow mb-6'>
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-all"
                        className={
                          cx(
                            "flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800",
                            { "bg-gray-800": equals(PresetNftFilter.All, value) }
                          )
                        }
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetNftFilter.All}
                          id="preset-all"
                        />
                        All
                      </label>
                    )}
                  />
                </li>
                <li>
                  <Controller
                    control={control}
                    name="preset"
                    render={({ field: { value, onChange } }) => (
                      <label
                        htmlFor="preset-listed"
                        className={
                          cx(
                            "flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800",
                            { "bg-gray-800": equals(PresetNftFilter.Listed, value) }
                          )
                        }
                      >
                        <input
                          onChange={onChange}
                          className="hidden"
                          type="radio"
                          name="preset"
                          value={PresetNftFilter.Listed}
                          id="preset-listed"
                        />
                        Listed for sale
                      </label>
                    )}
                  />
                </li>
                {connected && (
                  <li>
                    <Controller
                      control={control}
                      name="preset"
                      render={({ field: { value, onChange } }) => (
                        <label
                          htmlFor="preset-owned"
                          className={
                            cx(
                              "flex justify-between w-full px-4 py-2 mb-1 rounded-md cursor-pointer hover:bg-gray-800",
                              { "bg-gray-800": equals(PresetNftFilter.Owned, value) }
                            )
                          }
                        >
                          <input
                            onChange={onChange}
                            className="hidden"
                            type="radio"
                            name="preset"
                            value={PresetNftFilter.Owned}
                            id="preset-owned"
                          />
                          Owned by me
                        </label>
                      )}
                    />
                  </li>
                )}
              </ul>
              <div className="flex flex-row justify-between align-top w-full mb-2">
                <label className="label">Creators</label>
                <Link href="/" passHref>
                  <a>
                    Show All
                  </a>
                </Link>
              </div>
              <ul className="flex flex-col flex-grow mb-6">
                <li className='flex justify-between w-full px-4 py-2 mb-1 rounded-md bg-gray-800 hover:bg-gray-800'>
                  <h4>{truncateAddress(marketplace.ownerAddress)}</h4>
                </li>
              </ul>
              <div className='flex flex-col flex-grow gap-4'>
                {creator.attributeGroups.map(
                  ({ name: group, variants }, index) => (
                    <div className='flex flex-col flex-grow gap-2' key={group}>
                      <label className='label'>
                        {group}
                      </label>
                      <Controller
                        control={control}
                        name={`attributes.${index}`}
                        defaultValue={{ traitType: group, values: [] }}
                        render={({ field: { onChange, value } }) => {
                          return (
                            <Select
                              value={value.values}
                              isMulti
                              className='select-base-theme'
                              classNamePrefix='base'
                              onChange={(next: ValueType<OptionType>) => {
                                onChange({ traitType: group, values: next })
                              }}

                              options={
                                variants.map(({ name, count }) => ({
                                  value: name,
                                  label: `${name} (${count})`,
                                })) as OptionsType<OptionType>
                              }
                            />
                          )
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            </form>
          </div>
          <div className='grow'>
            <List
              data={nfts.data?.nfts}
              loading={nfts.loading}
              loadingComponent={<NftCard.Skeleton />}
              emptyComponent={(
                <div className='w-full p-10 text-center border border-gray-800 rounded-lg'>
                  <h3>No NFTs found</h3>
                  <p className='mt- text-gray-500'>No NFTs found matching these criteria.</p>
                </div>
              )}
              itemRender={(nft) => {
                return (
                  <Link passHref href={`/nfts/${nft.address}`} key={nft.address}>
                    <a>
                      <NftCard nft={nft} marketplace={marketplace} />
                    </a>
                  </Link>
                )
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatorShow