import { View, Alert, ScrollView, TouchableOpacity } from "react-native";
import React from "react";
import {
  AppBar,
  AssetImage,
  DescriptionText,
  HeightSpacer,
  HotelMap,
  NetworkImage,
  ReusableAlert,
  ReusableBtn,
  ReusableText,
  ReviewsList,
} from "../../components";
import { COLORS, SIZES } from "../../constants/theme";
import styles from "./hotelDetails.style";
import reusable from "../../components/Reusable/reusable.style";
import { Rating } from "react-native-stock-star-rating";
import { Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import fetchHotelById from "../../hook/fetchHotelById";
import { ActivityIndicator } from "react-native-paper";
import checkUser from "../../hook/checkUser";
import Loader from "../../components/Shimmers/Loader";

const HotelDetails = ({ navigation }) => {
  const { userLogin } = checkUser();
  const router = useRoute();
  const id = router.params;

  const { hotel, coordinates, isLoading, error, refetch } = fetchHotelById(id);

  const handleReviews = () => {
    if (userLogin) {
      navigation.navigate("AddReviews", id);
    } else {
      Alert.alert("Auth Error", "Please login to add comments", [
        {
          text: "Cancel",
          onPress: () => {},
        },
        {
          text: "Continue",
          onPress: () => {navigation.navigate('AuthTop')},
        },
        { defaultIndex: 1 },
      ]);
    }
  };

  if (isLoading) {
    return (
      <Loader />
    );
  }

  return (
    <ScrollView>
      <View style={{ height: 80 }}>
        <AppBar
          top={50}
          left={20}
          right={20}
          title={hotel.title}
          color={COLORS.white}
          icon={"message1"}
          color1={COLORS.white}
          onPress={() => navigation.goBack()}
          onPress1={handleReviews}
        />
      </View>

      <View>
        <View style={styles.container}>
          <NetworkImage
            source={hotel.imageUrl}
            width={"100%"}
            height={220}
            radius={25}
          />

          <View style={styles.titleContainer}>
            <View style={styles.titleColumn}>
              <ReusableText
                text={hotel.title}
                family={"medium"}
                size={SIZES.xLarge}
                color={COLORS.black}
              />

              <HeightSpacer height={10} />
              <ReusableText
                text={hotel.location}
                family={"medium"}
                size={SIZES.medium}
                color={COLORS.black}
              />

              <HeightSpacer height={15} />

              <View style={reusable.rowWithSpace("space-between")}>
                <Rating
                  maxStars={5}
                  stars={hotel.rating}
                  bordered={false}
                  color={"#FD9942"}
                />

                <ReusableText
                  text={`(${hotel.review})`}
                  family={"medium"}
                  size={SIZES.medium}
                  color={COLORS.gray}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.container, { paddingTop: 90 }]}>
          <ReusableText
            text={"Description"}
            family={"medium"}
            size={SIZES.large}
            color={COLORS.black}
          />

          <HeightSpacer height={10} />

          <DescriptionText text={hotel.description} />

          <HeightSpacer height={10} />

          <ReusableText
            text={"Location"}
            family={"medium"}
            size={SIZES.large}
            color={COLORS.black}
          />

          <HeightSpacer height={15} />

          <ReusableText
            text={hotel.location}
            family={"regular"}
            size={SIZES.small + 2}
            color={COLORS.gray}
          />
          <HotelMap coordinates={coordinates} />

          <View style={reusable.rowWithSpace("space-between")}>
            <ReusableText
              text={"Reviews"}
              family={"medium"}
              size={SIZES.large}
              color={COLORS.black}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate("AllReviews", id)}
            >
              <Feather name="list" size={20} />
            </TouchableOpacity>
          </View>

          <HeightSpacer height={10} />

          <ReviewsList reviews={hotel.reviews} />
        </View>
        <View style={[reusable.rowWithSpace("space-between"), styles.bottom]}>
          <View>
            <ReusableText
              text={`\$ ${hotel.price}`}
              family={"medium"}
              size={SIZES.large}
              color={COLORS.black}
            />
            <HeightSpacer height={5} />

            <ReusableText
              text={"Jan 01 - Dec 25"}
              family={"medium"}
              size={SIZES.medium}
              color={COLORS.gray}
            />
          </View>

          <ReusableBtn
            onPress={() => navigation.navigate("SelectRoom")}
            btnText={"Select Room"}
            width={(SIZES.width - 50) / 2.2}
            backgroundColor={COLORS.green}
            borderColor={COLORS.green}
            borderWidth={0}
            textColor={COLORS.white}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default HotelDetails;
