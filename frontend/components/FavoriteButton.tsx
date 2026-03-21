import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { favoriteAPI } from '../services/api';

interface FavoriteButtonProps {
  taskerId: string;
  size?: number;
  onToggle?: (isFavorite: boolean) => void;
  initialFavorite?: boolean;
  showAlert?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  taskerId,
  size = 24,
  onToggle,
  initialFavorite,
  showAlert = true,
}) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite ?? false);
  const [loading, setLoading] = useState(initialFavorite === undefined);

  useEffect(() => {
    // Only check status if initialFavorite wasn't provided
    if (initialFavorite === undefined) {
      checkFavoriteStatus();
    }
  }, [taskerId]);

  const checkFavoriteStatus = async () => {
    try {
      const result = await favoriteAPI.checkIsFavorite(taskerId);
      setIsFavorite(result.is_favorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      if (isFavorite) {
        await favoriteAPI.removeFavorite(taskerId);
        setIsFavorite(false);
        onToggle?.(false);
        if (showAlert) {
          Alert.alert('Removed', 'Removed from favorites');
        }
      } else {
        await favoriteAPI.addFavorite(taskerId);
        setIsFavorite(true);
        onToggle?.(true);
        if (showAlert) {
          Alert.alert('Added', 'Added to favorites!');
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, { width: size + 16, height: size + 16 }]} disabled>
        <ActivityIndicator size="small" color="#10b981" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={toggleFavorite}
      style={[
        styles.button,
        {
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          backgroundColor: isFavorite ? '#10b981' : 'rgba(255,255,255,0.1)',
          borderWidth: isFavorite ? 0 : 2,
          borderColor: 'rgba(16, 185, 129, 0.3)',
        },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? '#fff' : '#6b7280'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FavoriteButton;
